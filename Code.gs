const IMG_URL = 'https://logodix.com/logo/3.jpg'; // gmail logo url
const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAAAgweDMzo/messages?key=...';
const CARD_TITLE = 'Gmail Notification';
const CARD_SUBTITLE = 'Chat notification from gmail appscript';
const CARD_LINK = 'https://mail.google.com/mail/u/0/#inbox';

/**
 * array of search queries to loop through.
 * Update this with your queries that should result in a chat notification
 */
function config_gmail_search_array_() {

  // array of arrays, title of search, and then query to perform  
  var five_mins_ago_timestamp = get_unix_timestamp_last_x_mins(5);
  
  return [
    ['New email from bob in last 5 mins', 'from:bob@bob.com after:' + five_mins_ago_timestamp],
    //['Newer than 1 hour', 'newer_than:1h']
  ];

}

/**
 * 
 * This is the job you'll create a trigger for, so it runs every 5 mins or whatever.
 * Just make sure you search queries are appropriately scoped too.
 * IE: if you're running this every 5 mins, then make sure your search query specifies 
 * to only check for things in the last 5 mins, or it will match previously notified 
 * items (or include read/unread modifiers)
 */
function job_check_gmail() {

  var search_query_array = config_gmail_search_array_();
  
  for (var i = 0; i < search_query_array.length; i++) {

      console.log('searching: ' + search_query_array[i][1]);
      
      var result = search_gmail_(search_query_array[i][1]);

      if(result > 0) {

        postTopicAsCard_(WEBHOOK_URL, CARD_TITLE, CARD_SUBTITLE, IMG_URL, search_query_array[i][0], result + ' emails found', CARD_LINK);

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


function get_unix_timestamp_last_x_mins(num_minutes) {

  var current_time = Math.floor(Date.now() / 1000)

  console.log('current time: ' + current_time);

  var offset = num_minutes * 60;
  console.log('offset: ' + offset);
  
  var return_value = current_time - offset;

  console.log('returning: ' + return_value);

  return return_value

}



function search_gmail_(query_string) {
  
  return countQuery_(query_string);
  
}

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
        return_count++;
      });
    }
    pageToken = threadList.nextPageToken;
  } while (pageToken);

  return return_count;
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
  
  UrlFetchApp.fetch(webhook_url, options);
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
                        "text": "LINK",
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
