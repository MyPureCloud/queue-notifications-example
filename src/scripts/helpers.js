var helpers = {
	getParameterByName: function(name, url) {
	    if (!url) url = window.location.href;
	    name = name.replace(/[\[\]]/g, "\\$&");
	    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	        results = regex.exec(url);
	    if (!results) return '';
	    if (!results[2]) return '';
	    return decodeURIComponent(results[2].replace(/\+/g, " "));
	}, 
	displayQueuesList: function(queueList) {
		$.each(queueList, function(index, queue) {
			var tableRow = '<tr id="' + queue.id + '">' + 
					'<td>' + queue.name + '</td>' +
					'<td><button id="' + queue.id + '-button" class="queueButton btn btn-default" onclick="toggleQueueSubscription(\'' + queue.id + '\')">SUBSCRIBE</button></td>' +
				'</tr>';
			$('#queuesTableBody').append(tableRow);
		})
	},
	addOrUpdateConversation(queueId, conversation) {
		//$('body').append('<pre>'+JSON.stringify(conversation)+'</pre>');
		var participantCount = conversation.participants.length;

		var participantsHtml = '';
		$.each(conversation.participants, function(index, participant) {
			var participantClass = isParticipantDisconnected(participant) ? 
				'danger' : 
				isParticipantConnected(participant) ?
					'success' :
					'';
			participantsHtml += '<tr class="' + participantClass + '">';
			if (index == 0)
				participantsHtml += '<td rowspan="' + participantCount + '" style="background-color: #f5f5f5 !important">' + conversation.id + '</td>';
			participantsHtml += generateParticipantDataCells(participant);
			participantsHtml += '</tr>';
		});

		if ($('#' + conversation.id + '-data').length) {
			$('#' + conversation.id + '-data').html(participantsHtml);
		}
		else {
			$('#conversationsTable').append('<tbody id="' + conversation.id + '-data">' + participantsHtml + '</tbody>');
		}

		if (isConversationDisconnected(conversation) && isWrapupComplete(conversation)) {
			// Everyone is disconnected and wrapup has been provided (or was not required)
			// Remove conversation from UI in 10 seconds
			setTimeout(function() {
				$('#' + conversation.id + '-data').fadeOut(1000, function() {
					$('#' + conversation.id + '-data').remove();
				});
			}, 10 * 1000);
		}
	}
};

function generateParticipantDataCells(participant) {
	var wrapup = participant.wrapup ? 
		participant.wrapup.code : 
		participant.wrapupRequired ?
			'<i>awaiting</i>' :
			'';

	return '<td>' + formatCellData(participant.id) + '</td>' +
		'<td>' + formatCellData(participant.name) + '</td>' +
		'<td>' + formatCellData(participant.userId) + '</td>' +
		'<td>' + formatCellData(participant.connectedTime, 'date') + '</td>' +
		'<td>' + formatCellData(participant.endTime, 'date') + '</td>' +
		'<td>' + formatCellData(participant.queueId) + '</td>' +
		'<td>' + formatCellData(participant.purpose) + '</td>' +
		'<td>' + formatCellData(participant.address) + '</td>' +
		'<td>' + formatCellData(wrapup) + '</td>';
}

function isConversationDisconnected(conversation) {
 	try {
 		// Check to see if there are any that aren't disconnected
		var hasConnected = false;
 		$.each(conversation.participants, function(index, participant) {
 			if (!isParticipantDisconnected(participant))
 				hasConnected = true;
 		});
 		return !hasConnected;
 	} catch(error) {
 		console.error(error);
 		return false;
 	}
}

function isWrapupComplete(conversation) {
	var awaitingWrapup = false;
	$.each(conversation.participants, function(index, participant) {
		if (participant.wrapupRequired == true && !participant.wrapup)
			awaitingWrapup = true;
	});

	return !awaitingWrapup;
}

function isParticipantDisconnected(participant) {
	if (!(areAllInteractionsDisconnected(participant.calls) &&
		areAllInteractionsDisconnected(participant.callbacks) &&
		areAllInteractionsDisconnected(participant.chats) &&
		areAllInteractionsDisconnected(participant.cobrowse) &&
		areAllInteractionsDisconnected(participant.emails) &&
		areAllInteractionsDisconnected(participant.socialExpressions) &&
		areAllInteractionsDisconnected(participant.videos))) {
		//console.debug('participant ' + participant.name + ' is connected');
		return false;
	}
	//console.debug('participant ' + participant.name + ' is disconnected');
	return true;
}

function areAllInteractionsDisconnected(interactionsList) {
	if (!interactionsList) return true;

	var hasConnected = false;
	$.each(interactionsList, function(index, interaction) {
		//console.debug('state: ' + interaction.state)
		if (interaction.state.toLowerCase() != 'disconnected') {
			//console.debug('Interaction not disconnected')
			hasConnected = true;
		}
	});

	return !hasConnected;
}

function isParticipantConnected(participant) {
	if (areAnyInteractionsConnected(participant.calls) ||
		areAnyInteractionsConnected(participant.callbacks) ||
		areAnyInteractionsConnected(participant.chats) ||
		areAnyInteractionsConnected(participant.cobrowse) ||
		areAnyInteractionsConnected(participant.emails) ||
		areAnyInteractionsConnected(participant.socialExpressions) ||
		areAnyInteractionsConnected(participant.videos)) {
		return true;
	}
	return false;
}

function areAnyInteractionsConnected(interactionsList) {
	if (!interactionsList) return false;

	var hasConnected = false;
	$.each(interactionsList, function(index, interaction) {
		if (interaction.state.toLowerCase() == 'connected') {
			hasConnected = true;
		}
	});

	return hasConnected;
}

function formatCellData(data, type) {
	if (!data) return '';
	switch(type) {
		case 'date': {
			try {
				var date = new Date(data);

				// http://stackoverflow.com/questions/25275696/javascript-format-date-time
				var hours = date.getHours();
				var minutes = date.getMinutes();
				var ampm = hours >= 12 ? 'pm' : 'am';
				hours = hours % 12;
				hours = hours ? hours : 12; // the hour '0' should be '12'
				minutes = minutes < 10 ? '0'+minutes : minutes;
				var strTime = hours + ':' + minutes + ' ' + ampm;

				// Include date if not today
				if (date.getDate() != (new Date()).getDate())
					return date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
				else
					return strTime;
			} catch(error) {
				console.error(error);
			}
		}
		default: {
			return data.toString();
		}
	}
}










