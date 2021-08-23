function checkFirstAnswer(res, conv) {
  let userDataContext = {}
  
  conv.outputContexts.forEach(context => {
    if(context.name.split('/').pop() == 'user-data'){
      userDataContext = context
    }
  })

  const contextAnswer = userDataContext.parameters.authQuestions.answerOne
  const givenAnswer = conv.queryResultParameters.animal

  console.log('contextAnswer: ', contextAnswer)
  console.log('givenAnswer: ', conv.queryResultParameters)

  // Check to see if the answer matches to the one from the db
  if(contextAnswer == givenAnswer){
    const fulfillmentMessagesArray = [
      {
        "text": {
          "text": [
            "Thanks, you're logged in. How may I help you today?"
          ]
        }
      }
    ]
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/validated`,
          "lifespanCount": 1
        }
      ]
    }
    res.send(resJSON)
  } else {
    // Move onto question 2
    const fulfillmentMessagesArray = [
      {
        "text": {
          "text": [
            `${userDataContext.parameters.authQuestions.questionTwo}`
          ]
        }
      }
    ]
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/authentication-second`,
          "lifespanCount": 1
        }
      ]
    }
    res.send(resJSON)
  }
}

function checkSecondAnswer(res, conv) {
  let userDataContext = {}
  
  conv.outputContexts.forEach(context => {
    if(context.name.split('/').pop() == 'user-data'){
      userDataContext = context
    }
  })

  const contextAnswer = userDataContext.parameters.authQuestions.answerTwo
  const givenAnswer = conv.queryResultParameters.color
  
  console.log('contextAnswer: ', contextAnswer)
  console.log('givenAnswer: ', givenAnswer)

  // Check to see if the answer matches to the one from the db
  if(contextAnswer == givenAnswer){
    const fulfillmentMessagesArray = [
      {
        "text": {
          "text": [
            "Thanks, you're logged in. How may I help you today?"
          ]
        }
      }
    ]
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/validated`,
          "lifespanCount": 1
        }
      ]
    }
    res.send(resJSON)
  } else {
    // Reject Caller
    const fulfillmentMessagesArray = [
      {
        "text": {
          "text": [
            "Sorry but we can't authenticate you at this time. Good bye"
          ]
        }
      }
    ]
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/exit-call`,
          "lifespanCount": 1
        }
      ],
      "events": [
        {
          "name": "actions_intent_CANCEL"
        }
      ]
    }
    res.send(resJSON)
  }
}

module.exports = {
  checkFirstAnswer,
  checkSecondAnswer
}