function checkForPin(conv){
    let userPin = ""
    conv.outputContexts.forEach(context => {
        if(context.name.split('/').pop() == 'user-data'){
            userPin = context.parameters.userPin
        }
    })

    if (userPin){
        return userPin
    } else {
        return  false
    }
}

function verifyPin(res, conv) {
    let userDataContext = {} 
    conv.outputContexts.forEach(context => {
      if(context.name.split('/').pop() == 'user-data'){
        userDataContext = context
      }
    })

    const userPin = userDataContext.parameters.userPin
    const givenPin = conv.queryResultParameters.givenPin.toString()

    if (userPin == givenPin) {
        // proceed to authentication
        const fulfillmentMessagesArray = [
            {
              "text": {
                "text": [
                  "Awesome, Now Proceeding to Authentication"
                ]
              }
            },
            {
              "text": {
                "text": [
                  `${userDataContext.parameters.authQuestions.questionOne}`
                ]
              }
            }
          ]
          const resJSON = {
            "fulfillmentMessages": fulfillmentMessagesArray,
            "outputContexts": [
              {
                "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/authentication-start`,
                "lifespanCount": 1
              }
            ]
          }
          res.send(resJSON)
    } else {
        // request pin again
        reRequestPin(res, conv)
    }
}

function reRequestPin(res, conv){
    // Retrieve the retry count
    let retryCount = 0
    conv.outputContexts.forEach(context => {
      if(context.name.split('/').pop() == 'retry-counter'){
          retryCount = parseInt(context.parameters.counter)
      }
    })
  
    console.log('system counter: ', retryCount)
  
    // If the user entered the old account number wrong 2 times, exit call
    if (retryCount >= 1) {
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
    } else {
      // Increment counter value
      retryCount = (retryCount += 1).toString()
      const fulfillmentMessagesArray = [
        {
          "text": {
            "text": [
              "That pin does not match my records, please  try another 4 digit pin"
            ]
          }
        }
      ]
      const resJSON = {
        "fulfillmentMessages": fulfillmentMessagesArray,
        "outputContexts": [
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/verify-pin`,
            "lifespanCount": 1
          },
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/retry-counter`,
            "lifespanCount": 1,
            "parameters": {
              "counter": retryCount.toString()
            }
          }
        ]
      }
      res.send(resJSON)
    }
  }

  module.exports = {
    verifyPin
  }