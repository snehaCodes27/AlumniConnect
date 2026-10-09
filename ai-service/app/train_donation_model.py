"""Train on real, pre-campaign engagement snapshots with known 90-day outcomes.
CSV: alumniId, snapshotDate, six FEATURES, donatedWithin90Days (0/1).
One observation per alumnus prevents train/test identity leakage. Never use
engagement collected after snapshotDate. Only mature 90-day outcomes are valid.
"""
import argparse
import csv
import json
import math
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from app.services.donation_prediction import FEATURES, transform, sigmoid

def train(rows, now=None):
    now = now or datetime.now(timezone.utc)
    if len(rows) < 50:
        raise ValueError('At least 50 real labeled alumni snapshots are required')
    ids = [r['alumniId'].strip() for r in rows]
    if any(not x for x in ids) or len(set(ids)) != len(ids):
        raise ValueError('Provide one snapshot per distinct alumniId')
    examples = {0:[],1:[]}
    for row in rows:
        label = row['donatedWithin90Days']
        if str(label) not in ('0','1'):
            raise ValueError('Donation outcomes must be observed binary 0 or 1')
        snapshot = datetime.fromisoformat(row['snapshotDate'].replace('Z','+00:00'))
        if snapshot.tzinfo is None:
            snapshot = snapshot.replace(tzinfo=timezone.utc)
        if snapshot > now - timedelta(days=90):
            raise ValueError('Every snapshot needs a fully observed 90-day outcome window')
        features = {k:row[k] for k in FEATURES}
        if features['daysSinceLogin'] in ('', None):
            features['daysSinceLogin'] = None
        examples[int(label)].append((transform(features), int(label)))
    if min(len(v) for v in examples.values()) < 10:
        raise ValueError('At least 10 donors and 10 non-donors are required')
    rng = random.Random(42)
    fitting, testing = [], []
    for group in examples.values():
        rng.shuffle(group)
        split = max(2, round(len(group)*0.2))
        testing.extend(group[:split]); fitting.extend(group[split:])
    weights, intercept = [0.0]*len(FEATURES), 0.0
    for _ in range(2000):
        gradients, bias = [0.0]*len(FEATURES), 0.0
        for x,y in fitting:
            error = sigmoid(intercept + sum(a*b for a,b in zip(weights,x))) - y
            bias += error
            for i in range(len(weights)):
                gradients[i] += error*x[i]
        intercept -= 0.15*bias/len(fitting)
        weights = [w - 0.15*(g/len(fitting) + 0.01*w) for w,g in zip(weights,gradients)]
    probabilities = [sigmoid(intercept + sum(a*b for a,b in zip(weights,x))) for x,y in testing]
    prevalence = sum(y for x,y in fitting)/len(fitting)
    metrics = {'trainingRows':len(fitting), 'testRows':len(testing),
        'testDonationRate':sum(y for x,y in testing)/len(testing),
        'brierScore':sum((p-y)**2 for p,(x,y) in zip(probabilities,testing))/len(testing),
        'baselineBrierScore':sum((prevalence-y)**2 for x,y in testing)/len(testing),
        'logLoss':-sum(y*math.log(max(p,1e-12))+(1-y)*math.log(max(1-p,1e-12)) for p,(x,y) in zip(probabilities,testing))/len(testing)}
    stamp = now.isoformat()
    return {'formatVersion':1,'features':FEATURES,'coefficients':weights,'intercept':intercept,
            'version':f'logistic-{stamp}','trainedAt':stamp,'engagementWindowDays':90,'outcomeWindowDays':90,'metrics':metrics}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    with open(args.csv, newline='', encoding='utf-8-sig') as source:
        model = train(list(csv.DictReader(source)))
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(model, indent=2, allow_nan=False), encoding='utf-8')
    print(json.dumps(model['metrics'], indent=2))
