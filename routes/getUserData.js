var express = require('express');
var router = express.Router();

/* GET users listing. */
router.post('/', function(req, res, next) {
  console.log(req.body)
  const conv = {
    "responseId" : req.body.responseId,
    "projectId": req.body.session.split('/').pop(), 
    "sessionId": req.body.session.split('/')[1]
  }

  switch(req.body.queryResult.intent.displayName) {
    case 'Default Welcome Intent':
      // res.send(createTextResponse("connected to functions in local node"))
      try {
        res.send(retreivePhoneNumber(conv))
      } catch (error) {
        console.log('Error in Default Welcome Intent', err)
      }
  }
});

function retreivePhoneNumber(conv) {
  const {projectId, sessionId} = conv
  const fulfillmentMessagesArray = [
    {
      "text": {
        "text": [
          "Welcome to ABC Credit Union!"
        ]
      }
    },
    {
      "text": {
        "text": [
          "Please enter the phone number registered with your account, you can enter it either in the keypad or say it out loud"
        ]
      }
    }
  ]

  const resJSON = {
    "fulfillmentMessages": fulfillmentMessagesArray,
    "outputContexts": [
      {
        "name": `projects/${projectId}/agent/sessions/${sessionId}/contexts/getNewPhoneNumber`,
        "lifespanCount": 5,
        "parameters": {
          'oldNumber': '1234567890'
        }
      }
    ]
  }

  return resJSON
}


function createTextResponse(textResponse){
  let response = {
    "fulfillmentMessages": [
      {
        "text": {
          "text": [
            textResponse
          ]
        }
      }
    ]
  }
  return response
}

function createContext(projectId, sessionId, contextName, lifespan, parameters) {
  // format for parameters
  // "parameters": {
  //   "param-name": "param-value"
  // }
  let response = {
    "outputContexts": [
      {
        "name": `projects/${projectId}/agent/sessions/${sessionId}/contexts/${contextName}`,
        "lifespanCount": lifespan,
        "parameters": parameters
      }
    ]
  }
  return response
}

module.exports = router;
