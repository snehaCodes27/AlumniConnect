"""Donation outreach baseline and optional logistic model; no third-party dependencies.
Only engagement aggregates enter the model. Baseline scores are NOT probabilities.
"""
import json
import math
from pathlib import Path

FEATURES = ['completedMentorships', 'communityContributions', 'hostedEvents', 'postedJobs', 'attendedEvents', 'daysSinceLogin']
CAPS = [5, 20, 3, 5, 5]
WEIGHTS = [25, 20, 15, 15, 10, 15]
VERSION = 'engagement-baseline-v1'

def transform(record):
    result = []
    for key, cap in zip(FEATURES[:5], CAPS):
        value = float(record.get(key, 0))
        if not math.isfinite(value) or value < 0:
            raise ValueError('Activity counts must be finite and non-negative')
        result.append(min(value / cap, 1.0))
    days = record.get('daysSinceLogin')
    if days is None:
        result.append(0.0)
    else:
        days = float(days)
        if not math.isfinite(days) or days < 0:
            raise ValueError('Login recency must be finite and non-negative')
        result.append(math.exp(-days / 30))
    return result

def sigmoid(value):
    return 1 / (1 + math.exp(-max(-40, min(40, value))))

def validate_model(model):
    if model.get('features') != FEATURES or model.get('formatVersion') != 1:
        raise ValueError('Unsupported donation model format')
    coefficients = model.get('coefficients', [])
    if len(coefficients) != len(FEATURES) or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in coefficients + [model.get('intercept')]):
        raise ValueError('Invalid donation model coefficients')
    if model.get('engagementWindowDays') != 90 or model.get('outcomeWindowDays') != 90:
        raise ValueError('Model window must match the 90-day prediction contract')
    metrics = model.get('metrics') or {}
    if not model.get('trainedAt') or not isinstance(model.get('version'), str):
        raise ValueError('Model requires training and version metadata')
    for key in ['brierScore', 'baselineBrierScore', 'logLoss', 'testDonationRate', 'trainingRows', 'testRows']:
        value = metrics.get(key)
        if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError('Model requires valid held-out evaluation metadata')
    if metrics['testRows'] < 4 or metrics['trainingRows'] < 20:
        raise ValueError('Model evaluation sample is insufficient')
    return model

def predict(records, model=None):
    if model is not None:
        validate_model(model)
    predictions = []
    for record in records:
        values = transform(record)
        if model:
            value = sigmoid(model['intercept'] + sum(a*b for a,b in zip(model['coefficients'], values)))
            score = round(value * 100, 1)
        else:
            score = round(sum(a*b for a,b in zip(WEIGHTS, values)), 1)
        signals = [{'feature':key, 'value':record.get(key), 'contribution': round((model['coefficients'][i] * values[i]) if model else WEIGHTS[i]*values[i], 2)} for i,key in enumerate(FEATURES)]
        predictions.append({'id':record['id'], 'score':score, 'probability':value if model else None,
                            'band':'High' if score >= 60 else 'Medium' if score >= 30 else 'Low',
                            'signals':sorted(signals, key=lambda s:abs(s['contribution']), reverse=True)})
    metadata = {'mode':'trained_model' if model else 'engagement_baseline',
                'version':model['version'] if model else VERSION,
                'engagementWindowDays':90, 'outcomeWindowDays':90 if model else None,
                'metrics':model['metrics'] if model else None,
                'trainedAt':model['trainedAt'] if model else None,
                'notice':'Model estimates need local validation; they do not establish willingness or ability to donate.' if model else 'Preliminary engagement score, not a donation probability. No labeled donation history has been used.'}
    return {'predictions':predictions, 'model':metadata}

if __name__ == '__main__':
    import argparse
    import sys
    parser = argparse.ArgumentParser()
    parser.add_argument('--model')
    args = parser.parse_args()
    model = None
    if args.model:
        model = json.loads(Path(args.model).read_text(encoding='utf-8'))
    payload = json.load(sys.stdin)
    print(json.dumps(predict(payload['records'], model), allow_nan=False))
