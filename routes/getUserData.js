var express = require('express');
var router = express.Router();

// Firebase Setup
const admin = require('firebase-admin')
const serviceAccount = require('../ServiceAccountKey.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://abccreditunionbot-9ulv.firebaseio.com'
})
const db = admin.firestore()

// Import Functions
const aniFunctions = require('../functions/aniFunctions')
const pinAuthFunctions = require('../functions/pinAuthFunctions')
const authQuestionFunctions = require('../functions/authQuestionFunctions')

// Dialoflow functions
router.post('/', function(req, res, next) {
  console.log(req.body)
  // console.log(req)

  const conv = {
    "responseId" : req.body.responseId,
    "projectId": req.body.session.split('/').pop(), 
    "sessionId": req.body.session.split('/')[1],
    "queryResult": req.body.queryResult,
    "queryResultParameters": req.body.queryResult.parameters,
    "outputContexts": req.body.queryResult.outputContexts
    // "telephony": req.body.originalDetectIntentRequest.payload
  }
  const givenIntent = req.body.queryResult.intent.displayName

  switch(givenIntent) {
    case 'Default Welcome Intent':
      tCFunction(aniFunctions.welcomeMessage(res,conv))
      break
    case 'Get Current Number':
      tCFunction(aniFunctions.retrievePhoneNumber(res,conv))
      break
    case 'updateNumber':
      tCFunction(aniFunctions.searchForUser(res, conv))
      break
    case 'updateNumber - yes':
      tCFunction(aniFunctions.updatePhoneNumber(res, conv))
      break
    case 'updateNumber - no':
      tCFunction(res.send(aniFunctions.notUpdatingPhoneNumber(res,conv)))
      break
    case 'verify-pin':
      tCFunction(pinAuthFunctions.verifyPin(res, conv))
      break
    case 'First Authentication Question':
      // tCFunction(authQuestionFunctions.checkFirstAnswer(res, conv))
      console.log('Case: ', givenIntent)
    try {
      authQuestionFunctions.checkFirstAnswer(res, conv)
    } catch (error) {
      console.log('Error in ', givenIntent, ' Intent: ', error)
    }
      break
    case 'Second Authentication Question':
      tCFunction(authQuestionFunctions.checkSecondAnswer(res, conv))
      break
  }

  function tCFunction(runFunction) {
    console.log('Case: ', givenIntent)
    try {
      runFunction
    } catch (error) {
      console.log('Error in ', givenIntent, ' Intent: ', error)
    }
  }
});

module.exports = router;
