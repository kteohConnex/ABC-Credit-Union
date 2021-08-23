const admin = require('firebase-admin')
const db = admin.firestore()

function notUpdatingPhoneNumber(res, conv){
  let userDataContext = {}
  
  conv.outputContexts.forEach(context => {
    if(context.name.split('/').pop() == 'user-data'){
      userDataContext = context
    }
  })
  checkForPinAndRespond(res, conv, userDataContext)
}

function checkForPinAndRespond(res, conv, userDataContext, newNumber){
  const contextNumber = newNumber || userDataContext.parameters.telephone

  const parameters = {
    "telephone": contextNumber
  }

  let fulfillmentMessagesArray = [
        {
      "text": {
        "text": [
            `Hi ${userDataContext.parameters.firstName}, I hope that you're doing well today!`
        ]
      }
    }
  ]
  let outputContexts = [
    {
      "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/user-data`,
      "lifespanCount": 1,
      "parameters": parameters
      }
  ]

  if (newNumber) {
    fulfillmentMessagesArray.unshift(
      {
        "text": {
          "text": [
              "Great! Your number has been updated!"
          ]
        }
      }
    )
  }

  // Change message and context based on presence of PIN number
  if (userDataContext.parameters.userPin) {
    fulfillmentMessagesArray.push(
      {
        "text": {
          "text": [
              `Can I please have the 4 digit pin associated with this account?`
          ]
        }
      }
    )
    outputContexts.push(
      {
        "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/verify-pin`,
        "lifespanCount": 1,
        }
    ) 
  } else {
    fulfillmentMessagesArray.push(
      {
        "text": {
          "text": [
            `${userDataContext.parameters.authQuestions.questionOne}`
          ]
        }
      }
    )
    outputContexts.push(
      {
        "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/authentication-start`,
        "lifespanCount": 1,
        }
    ) 
  }
  const resJSON = {
    "fulfillmentMessages": fulfillmentMessagesArray,
    "outputContexts": outputContexts
  }
  res.send(resJSON)
}

function updatePhoneNumber(res, conv) {
  let userDataContext = {}
    
  conv.outputContexts.forEach(context => {
    if(context.name.split('/').pop() == 'user-data'){
      userDataContext = context
    }
  })

  let newNumber = userDataContext.parameters.firstGivenNumber
  const documentId = userDataContext.parameters.documentId

  updateUserPhoneNumber(res, documentId, newNumber)
  checkForPinAndRespond(res, conv, userDataContext, newNumber)
}

function updateUserPhoneNumber(res, documentId, newPhoneNumber) {
  const userDocs = db.collection('user').doc(documentId)

  // Update phone number in  db
  return userDocs.update({
    telephone: newPhoneNumber
  })
  .then(() => {
    console.log("Document successfully updated!");
  })
  .catch((error) => {
    // The document probably doesn't exist.
    console.error("Error updating document: ", error);
  });
}

function searchForUser(res, conv) {
  const oldNumber = conv.queryResultParameters['phone-number']
  if (oldNumber) {
    pullUserDataFromOldNumber(conv).then(resJSON => {
      res.send(resJSON)
    }).catch(error =>{
      console.log("Could Not Retrieve with Old Number: ", error)
      // Could not retrieve with given number, request again
      reRequestPhoneNumber(res, conv)
    })
  }
}

function reRequestPhoneNumber(res, conv){
  // Retrieve the retry count
  let retryCount = 0
  conv.outputContexts.forEach(context => {
    if(context.name.split('/').pop() == 'retry-counter'){
        retryCount = parseInt(context.parameters.counter)
    }
  })

  console.log('system counter: ', retryCount)

  // If the user entered the old account number wrong 2 times, then transfer to agent
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
            "That number could not be found, could I please have the number again?"
          ]
        }
      }
    ]
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/updatenumber-followup`,
          "lifespanCount": 1
        },
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/getOldPhoneNumber`,
          "lifespanCount": 1,
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

function pullUserDataFromOldNumber(conv){
  const oldNumber = conv.queryResultParameters['phone-number']
  const userDocs = db.collection('user').where('telephone', '==', oldNumber);
  let userData = []
  return userDocs.get()
    .then((doc) => {
      if (doc.size >= 1) {
        doc.forEach((doc) => {
          let parameters = {
            "userPin": doc.data().pin,
            "firstName": doc.data().firstName,
            "lastName": doc.data().lastName,
            "account": doc.data().account,
            "telephone": doc.data().telephone,
            "authQuestions": doc.data().authQuestions,
            "documentId": doc.id
          }
          userData.push(parameters)
        });
      } else {
        throw `No data found in the database with number: ${oldNumber}`
      }
    })
    .then( () => {
      return resJSON = createContext(conv.projectId, conv.sessionId, 'user-data', 5, userData[0]) 
    }).catch((err) => {
      console.log("error in pullUserDataFromOldNumber: ", err)
      throw `No data found in the database with number: ${oldNumber}`
    });
}

function retrievePhoneNumber(res, conv) {
  const firstGivenNumber = conv.queryResultParameters['phone-number']
  const userDocs = db.collection('user').where('telephone', '==', firstGivenNumber);
  let userData = []
  return userDocs.get()
    .then((doc) => {
      if (doc.size >= 1) {
          doc.forEach((doc) => {
          let parameters = {
            "userPin": doc.data().pin,
            "firstName": doc.data().firstName,
            "lastName": doc.data().lastName,
            "account": doc.data().account,
            "telephone": doc.data().telephone,
            "authQuestions": doc.data().authQuestions,
            "documentId": doc.id
          }
          userData.push(parameters)
        });
      } else {
        throw `No data found in the database with number: ${firstGivenNumber}`
      }
    })
    .then( () => {
       let fulfillmentMessagesArray = [
            {
          "text": {
            "text": [
                `Hi ${userData[0].firstName}, I hope that you're doing well today!`
            ]
          }
        }
      ]
      let outputContexts = [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/user-data`,
          "lifespanCount": 1,
          "parameters": userData[0]
        }
      ]
    
      // Change message and context based on presence of PIN number
      if (userData[0].userPin) {
        fulfillmentMessagesArray.push(
          {
            "text": {
              "text": [
                  `Can I please have the 4 digit pin associated with this account?`
              ]
            }
          }
        )
        outputContexts.push(
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/verify-pin`,
            "lifespanCount": 1,
            }
        ) 
      } else {
        fulfillmentMessagesArray.push(
          {
            "text": {
              "text": [
                `${userData[0].authQuestions.questionOne}`
              ]
            }
          }
        )
        outputContexts.push(
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/authentication-start`,
            "lifespanCount": 1,
            }
        ) 
      }
      const resJSON = {
        "fulfillmentMessages": fulfillmentMessagesArray,
        "outputContexts": outputContexts
      }
      res.send(resJSON)
      
    }).catch((err) => {
      // Could not find with new number
      console.log('.thenCatch', err)
      const fulfillmentMessagesArray = [
        {
          "text": {
            "text": [
              "That number could not be found, Can we try another phone number associated with your account?"
            ]
          }
        }
      ]  
      const resJSON = {
        "fulfillmentMessages": fulfillmentMessagesArray,
        "outputContexts": [
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/getOldPhoneNumber`,
            "lifespanCount": 1,
          },
          {
            "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/user-data`,
            "lifespanCount": 1,
            "parameters": {
              'firstGivenNumber': firstGivenNumber
            }
          }
        ]
      }
      res.send(resJSON)
    });
}

function welcomeMessage(res, conv) {
  // if(conv.queryResultParameters.queryText == 'TELEPHONY_WELCOME') {
    // If calling from a telephone, store and search phone number
    // Ignored storage in this project, { telephony: { caller_id: 'REDACTED_IN_STANDARD_TIER_AGENT' } } was the response from
    // req.body.originalDetectIntentRequest.payload
  // } else {
    // Else, continue with text prompts
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
            "Please enter your current phone number"
          ]
        }
      }
    ]
  
    const resJSON = {
      "fulfillmentMessages": fulfillmentMessagesArray,
      "outputContexts": [
        {
          "name": `projects/${conv.projectId}/agent/sessions/${conv.sessionId}/contexts/getCurrentPhoneNumber`,
          "lifespanCount": 1,
        }
      ]
    }
    res.send(resJSON)
  }
  // }

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

module.exports = {
    updatePhoneNumber,
    updateUserPhoneNumber,
    searchForUser,
    reRequestPhoneNumber,
    pullUserDataFromOldNumber,
    welcomeMessage,
    retrievePhoneNumber,
    notUpdatingPhoneNumber,
    createTextResponse,
    createContext
}