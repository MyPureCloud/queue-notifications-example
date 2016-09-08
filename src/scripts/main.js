var pureCloudSession;
var usersApi;
var routingApi;
var notificationsApi;

const TOPIC_CONVERSATIONS = 'v2.routing.queues.{id}.conversations';
const TOPIC_CONVERSATIONS_REGEX = /v2\.routing\.queues\.([a-z0-9\-]{36})\.conversations/;

var _me = {};
var _webSocket;
var _channelId;
var _queues = [];

if (helpers.getParameterByName('extras').toLowerCase() != 'off') {
	$.getScript('/scripts/extras.js', function(script, textStatus, jqXHR) {
		console.log('Extras script loaded');
	});
}

$(document).ready(function() {
	// Create PC session
	pureCloudSession = purecloud.platform.PureCloudSession({
		environment: 'mypurecloud.com',
		strategy: 'implicit',
		clientId: '6a9c1924-d348-4f1b-bf4f-a8816ceb4230',
		redirectUrl: 'https://localhost:8443/',
		storageKey: 'queue-notifications-example-auth-token',
		timeout: 10000
	});

	// Log debug info to the console
	//pureCloudSession.debugLog = console.log;

	// Get auth token
	pureCloudSession.login()
		.then(function() {
			// Initialize API instances
			usersApi = new purecloud.platform.UsersApi(pureCloudSession);
			routingApi = new purecloud.platform.RoutingApi(pureCloudSession);
			notificationsApi = new purecloud.platform.NotificationsApi(pureCloudSession);

			// Get the user's data (to verify token) and return the promise
			return usersApi.getMe();
		})
		.then(function(getMeResult) {
			console.log(getMeResult);

			// Store the "me" object
			_me = getMeResult;

			// Get list of queues (function wraps API calls)
			return getQueues();
		})
		.then(function(queuesList) {
			// Save result
			_queues = queuesList;

			// Add to UI
			helpers.displayQueuesList(_queues);
		})
		.catch(function(error){
			console.error(error);
		});
});

// Get the list of queues. Returns a promise
function getQueues(pageSize = 1, pageNumber = 1, sortBy, name, active) {
	return new Promise(function(fulfill, reject) { 
		getQueuesImpl([], pageSize, pageNumber, sortBy, name, active, fulfill, reject);
	});
}

// Implementation of get queues to recursively get all queues and fulfill the promise when done
function getQueuesImpl(queuesList, pageSize, pageNumber, sortBy, name, active, fulfill, reject) {
	// Invoke API
	routingApi.getQueues(pageSize, pageNumber, sortBy, name, active)
			.then(function(getQueuesResponse) {
				try {
					// Append to list
					$.each(getQueuesResponse.entities, function(index, queue) {
						queuesList.push(queue);
					});

					if (getQueuesResponse.nextUri) {
						// Recurse
						console.log('Getting more queues from page ' + (getQueuesResponse.pageNumber + 1));
						getQueuesImpl(queuesList,
							getQueuesResponse.pageSize,
							getQueuesResponse.pageNumber + 1,
							sortBy,
							name,
							active,
							fulfill,
							reject);
					} else {
						// Fulfill promise
						fulfill(queuesList);
					}
				} catch (error) {
					console.log(error);
					reject(error);
				}
			})
			.catch(function(error){
				console.log(error);
				reject(error);
			});
}

function verifyWebsocket() {
	return new Promise(function(fulfill, reject) {
		if (_webSocket) {
			fulfill();
			return;
		}

		// Create a new notification channel
		notificationsApi.postChannels()
			.then(function(postChannelsResult) {
				_channelId = postChannelsResult.id;

				// Create web socket
				_webSocket = new WebSocket(postChannelsResult.connectUri);
				_webSocket.onopen = function(){
	                console.log('WebSocket open to ' + _webSocket.url);
	                fulfill();
	                return;
	            };
	            _webSocket.onclose = webSocketClosed;
	            _webSocket.onerror = webSocketError;
	            _webSocket.onmessage = handleNotification;
			})
			.catch(function(error){
				console.error(error);
				reject(error);
			});
	});
}

function toggleQueueSubscription(queueId) {
	verifyWebsocket()
		.then(function() {
			return notificationsApi.getChannelsChannelIdSubscriptions(_channelId);
		})
		.then(function(getChannelsChannelIdSubscriptionsResponse) {
			var topics = getChannelsChannelIdSubscriptionsResponse.entities;
			var queueTopic = TOPIC_CONVERSATIONS.replace('{id}', queueId).toLowerCase();

			// Look for subscription in list and remove it if found
			var foundIndex = -1;
			$.each(topics, function(index, topic) {
				if (topic.id.toLowerCase() == queueTopic) {
					foundIndex = index;
				}
			});

			if (foundIndex >= 0) {
				// Remove
				topics.splice(foundIndex, 1);
			} else {
				// Add
				topics.push({ id: queueTopic });
			}

			notificationsApi.putChannelsChannelIdSubscriptions(_channelId, topics)
				.then(function(putChannelsChannelIdSubscriptionsResult){
					if (foundIndex >= 0) {
						$('#' + queueId).removeClass('success');
						$('#' + queueId + '-button').html('SUBSCRIBE');
						console.log('Queue topic removed: ' + queueTopic);
					} else {
						$('#' + queueId).addClass('success');
						$('#' + queueId + '-button').html('UNSUBSCRIBE');
						console.log('Queue topic added: ' + queueTopic);
					}
				})
				.catch(function(error){
					console.error(error);
  				});
		})
		.catch(function(error){
			console.error(error);
		});
}

function handleNotification(message) {
	try {
		// Make sure there is data in the message 
		// (data should never be empty, but prevent parse error)
		if (!message.data) {
			console.warn('Message recieved, but there was no data!');
			console.log(message);
			return;
		}

		// Parse data into JSON object
		var data = JSON.parse(message.data);

		// Look for heartbeat
		if (data.topicName.toLowerCase() == 'channel.metadata') {
			console.log('THUMP thump...');
			return;
		}

		// Look for queue conversations topic
		var match = TOPIC_CONVERSATIONS_REGEX.exec(data.topicName.toLowerCase());
		if (match) {
			var queueId = match[1];
			console.log('Conversations notification for queue: ' + queueId);
			helpers.addOrUpdateConversation(queueId, data.eventBody);
			return;
		}

		// If we got here, the topic wasn't something we know about
		console.warn('Unexpected notification topic: ' + data.topicName);
	} catch(error) {
		console.error(error);
	}
}

function webSocketClosed(event) {
	console.warn('WebSocket closed!')
	console.log(event);
}

function webSocketError(error) {
	console.error(error);
}















