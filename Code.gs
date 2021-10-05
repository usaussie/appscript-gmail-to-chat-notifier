const IMG_URL = 'https://logodix.com/logo/3.jpg'; // gmail logo url
const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/{something}/messages?key=...';
const CARD_TITLE = 'Gmail Notification';
const CARD_SUBTITLE = 'Chat notification from gmail appscript';
const CARD_LINK = 'https://mail.google.com/mail/u/0/#inbox';
const SLACK_POST_URL = "https://hooks.slack.com/services/{something}/{else}";

/**
 * array of search queries to loop through.
 * Update this with your queries that should result in a chat notification
 */
function config_gmail_search_array_() {

  // array of arrays, title of search, and then query to perform  
  var five_mins_ago_timestamp = get_unix_timestamp_last_x_mins_(5);
  
  return [
    ['New email from bob in last 5 mins', 'from:bob@bob.com after:' + five_mins_ago_timestamp],
    //['Newer than 1 hour', 'newer_than:1h']
  ];

}


/**
 * DO NOT CHANGE ANYTHING UNDER THIS
 */

/**
* 
 * USE THIS OR THE OTHER JOB FUNCTION. DO NOT USE BOTH
 * 
 * This function sends a count of the number of emails matched to the chat notification card.
 * 
 * This is the job you'll create a trigger for, so it runs every 5 mins or whatever.
 * Just make sure you search queries are appropriately scoped too.
 * IE: if you're running this every 5 mins, then make sure your search query specifies 
 * to only check for things in the last 5 mins, or it will match previously notified 
 * items (or include read/unread modifiers)
 */
function job_check_gmail_count_only() {

  var search_query_array = config_gmail_search_array_();
  
  for (var i = 0; i < search_query_array.length; i++) {

      //console.log('searching: ' + search_query_array[i][1]);
      
      var result = countQuery_(search_query_array[i][1]);

      if(result > 0) {

        postTopicAsCard_(WEBHOOK_URL, CARD_TITLE, CARD_SUBTITLE, IMG_URL, search_query_array[i][0], result + ' emails found', CARD_LINK);

        post_to_slack_(CARD_TITLE, CARD_SUBTITLE, search_query_array[i][0], result + ' emails found', CARD_LINK)

      }

  }

}
/**
 * 
 * USE THIS OR THE OTHER JOB FUNCTION. DO NOT USE BOTH
 * 
 * This function sends a snippet of the matched emails to the chat notification card.
 * 
 * This is the job you'll create a trigger for, so it runs every 5 mins or whatever.
 * Just make sure you search queries are appropriately scoped too.
 * IE: if you're running this every 5 mins, then make sure your search query specifies 
 * to only check for things in the last 5 mins, or it will match previously notified 
 * items (or include read/unread modifiers)
 */
function job_check_gmail_thread_snippet() {

  var search_query_array = config_gmail_search_array_();
    
  for (var i = 0; i < search_query_array.length; i++) {

      //console.log('searching: ' + search_query_array[i][1]);
      
      var result = threadQuery_(search_query_array[i][1]);

      //console.log(result);

      if(result.length > 0) {

        //console.log('result length is longer than 0');

        result.forEach(async function(r) {
          
          // console.log('posting card now');
          console.log(r);

          postTopicAsCard_(WEBHOOK_URL, CARD_TITLE, CARD_SUBTITLE, IMG_URL, search_query_array[i][0], r, CARD_LINK);

          //post_to_slack_(CARD_TITLE, CARD_SUBTITLE, search_query_array[i][0], r, CARD_LINK)

          var slack_payload = format_slack_payload(search_query_array[i][0], CARD_TITLE, r)
  
          send_alert_to_slack(slack_payload);


        });

      }

  }

}

/**
 * 
 * returns the unix timestamp for the last X minutes,
 * which is helpful for the gmail search operators, which can't 
 * do "newer_than:5min", but can do "after:unixtimestamp"
 * searches. This helps because then you can trigger this
 * script every 5 mins, and only look for emails that came in
 * during the last 5 mins.
 * 
 */


function get_unix_timestamp_last_x_mins_(num_minutes) {

  var current_time = Math.floor(Date.now() / 1000)

  //console.log('current time: ' + current_time);

  var offset = num_minutes * 60;
  //console.log('offset: ' + offset);
  
  var return_value = current_time - offset;

  //console.log('returning: ' + return_value);

  return return_value

}

/**
 * 
 * Use this to just return a count of the emails matched to each search query.
 * Alternatively, use the other function (thread_query to show snippets of the email
 * in the card notification.
 * 
 */
function countQuery_(gmailQuery) {
  var pageToken;
  var return_count = 0;
  do {
    var threadList = Gmail.Users.Threads.list('me', {
      q: gmailQuery,
      pageToken: pageToken
    });
    if (threadList.threads && threadList.threads.length > 0) {
      threadList.threads.forEach(function(thread) {
        
        //console.log(thread);
        
        return_count++;
      });
    }
    pageToken = threadList.nextPageToken;
  } while (pageToken);

  return return_count;
}

function threadQuery_(gmailQuery) {
  var pageToken;
  
  var return_thread_array = [];
  do {
    var threadList = Gmail.Users.Threads.list('me', {
      q: gmailQuery,
      pageToken: pageToken
    });
    if (threadList.threads && threadList.threads.length > 0) {
      threadList.threads.forEach(function(thread) {
        
        return_thread_array.push(thread.snippet);
        
      });
    }
    pageToken = threadList.nextPageToken;
  } while (pageToken);

  return return_thread_array;
}



// quick function to take the info, send it to create a card, and then post the card.
function postTopicAsCard_(webhook_url, card_title, card_subtitle, img_url, content, bottom_label, card_link) {
  
  var card_json = createCardJson_(card_title, card_subtitle, img_url, content, bottom_label, card_link);

  // set options for what will be sent to Chat according to documentation
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(card_json)
  };
  
  result = UrlFetchApp.fetch(webhook_url, options);

  //console.log(result);
}

/**
 * Creates a card-formatted response.
  * @return {object} JSON-formatted response
 */
function createCardJson_(card_title, card_subtitle, img_url, content, bottom_label, card_link) {
  return {
    cards: [{
        "header": {
          "title": card_title,
          "subtitle": card_subtitle,
          "imageUrl": img_url
        },
        sections: [{
          widgets: [{
            "keyValue": {
                "topLabel": "New Post",
                "content": content,
                "contentMultiline": "false",
                "bottomLabel": bottom_label,
                "onClick": {
                      "openLink": {
                        "url": card_link
                      }
                  },
                "icon": "DESCRIPTION",
                "button": {
                    "textButton": {
                        "text": "OPEN GMAIL",
                        "onClick": {
                            "openLink": {
                                "url": card_link
                            }
                        }
                      }
                  }
              }
          }]
        }]
      }]
    };
}

/**
 * 
 * SLACK PIECES
 * 
 */

/**
 * ABOUT
 * Google Apps Script to post a message to Slack when someone responds to a Google Form.
 * 
 * Uses Slack incoming webhooks - https://api.slack.com/incoming-webhooks
 * and FormsResponse - https://developers.google.com/apps-script/reference/forms/form-response
 * 
 * 
 * AUTHOR
 * Akash A <github.com/akash1810>
 * 
 * 
 * USAGE
 * Free to use.
 */


function test_slack() {

  var payload = format_slack_payload('this is another title', 'this is another subtitle', 'this is anohther content')
  
  var result = send_alert_to_slack(payload);

}

function format_slack_payload(card_title, card_subtitle, content) {
  

  let payload = {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":bell: *" + card_title +"* :bell:"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": content
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": card_subtitle
        }
      },
      {
        "type": "divider"
      },
    ]
  };
  
  return payload;
};

function send_alert_to_slack(payload) {
  const webhook = SLACK_POST_URL;
  var options = {
    "method": "post", 
    "contentType": "application/json", 
    "muteHttpExceptions": true, 
    "payload": JSON.stringify(payload) 
  };
  
  try {
    UrlFetchApp.fetch(webhook, options);
  } catch(e) {
    Logger.log(e);
  }
}
