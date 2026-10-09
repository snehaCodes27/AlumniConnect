import unittest
from datetime import datetime, timezone, timedelta
from app.services.donation_prediction import predict, transform, FEATURES
from app.train_donation_model import train

class DonationTests(unittest.TestCase):
    def test_baseline_is_not_probability_and_missing_login_is_not_recent(self):
        prediction = predict([{'id':'a'}])
        self.assertEqual(prediction['predictions'][0]['score'],0)
        self.assertIsNone(prediction['predictions'][0]['probability'])
        self.assertEqual(prediction['model']['mode'],'engagement_baseline')
    def test_caps_and_login_decay(self):
        active = dict(id='a',completedMentorships=99,communityContributions=99,hostedEvents=99,postedJobs=99,attendedEvents=99,daysSinceLogin=0)
        self.assertEqual(predict([active])['predictions'][0]['score'],100)
        active['daysSinceLogin']=90
        self.assertLess(predict([active])['predictions'][0]['score'],86)
        with self.assertRaises(ValueError): transform({'postedJobs':-1})
        with self.assertRaises(ValueError): transform({'daysSinceLogin':float('nan')})
    def test_training_rejects_leakage_and_unknown_outcomes(self):
        now=datetime(2026,10,9,tzinfo=timezone.utc)
        # Synthetic fixtures exist only within tests, never as deployed model/data.
        rows=[{'alumniId':str(i),'snapshotDate':(now-timedelta(days=100)).isoformat(),**{k:str(i%5) for k in FEATURES},'donatedWithin90Days':str(i%2)} for i in range(60)]
        model=train(rows,now)
        self.assertEqual(model['metrics']['trainingRows']+model['metrics']['testRows'],60)
        self.assertGreater(model['metrics']['testRows'],0)
        result=predict([{'id':'a'}],model)
        self.assertTrue(0<=result['predictions'][0]['probability']<=1)
        rows[0]['alumniId']=rows[1]['alumniId']
        with self.assertRaises(ValueError): train(rows,now)
        rows[0]['alumniId']='0';rows[0]['snapshotDate']=now.isoformat()
        with self.assertRaises(ValueError): train(rows,now)
        rows[0]['snapshotDate']=(now-timedelta(days=100)).isoformat();rows[0]['donatedWithin90Days']='unknown'
        with self.assertRaises(ValueError): train(rows,now)
    def test_incompatible_model_is_not_silently_used_as_baseline(self):
        with self.assertRaises(ValueError): predict([{'id':'a'}],{'features':[]})

if __name__=='__main__': unittest.main()
