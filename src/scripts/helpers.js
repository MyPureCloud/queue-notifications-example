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
	generateParticipantDataCells: function(participant) {
		var wrapup = participant.wrapup ? 
			participant.wrapup.code : 
			participant.wrapupRequired ?
				'<i>awaiting</i>' :
				'';

		return '<td>' + helpers.formatCellData(participant.id) + '</td>' +
			'<td>' + helpers.formatCellData(participant.name) + '</td>' +
			'<td>' + helpers.formatCellData(participant.userId) + '</td>' +
			'<td>' + helpers.formatCellData(participant.connectedTime, 'date') + '</td>' +
			'<td>' + helpers.formatCellData(participant.endTime, 'date') + '</td>' +
			'<td>' + helpers.formatCellData(participant.queueId) + '</td>' +
			'<td>' + helpers.formatCellData(participant.purpose) + '</td>' +
			'<td>' + helpers.formatCellData(participant.address) + '</td>' +
			'<td>' + helpers.formatCellData(wrapup) + '</td>';
	},
	isConversationDisconnected: function(conversation) {
	 	try {
	 		// Check to see if there are any that aren't disconnected
			var hasConnected = false;
	 		$.each(conversation.participants, function(index, participant) {
	 			if (!helpers.isParticipantDisconnected(participant))
	 				hasConnected = true;
	 		});
	 		return !hasConnected;
	 	} catch(error) {
	 		console.error(error);
	 		return false;
	 	}
	},
	isWrapupComplete: function(conversation) {
		var awaitingWrapup = false;
		$.each(conversation.participants, function(index, participant) {
			if (participant.wrapupRequired == true && !participant.wrapup)
				awaitingWrapup = true;
		});

		return !awaitingWrapup;
	},
	isParticipantDisconnected: function(participant) {
		if (!(helpers.areAllInteractionsDisconnected(participant.calls) &&
			helpers.areAllInteractionsDisconnected(participant.callbacks) &&
			helpers.areAllInteractionsDisconnected(participant.chats) &&
			helpers.areAllInteractionsDisconnected(participant.cobrowse) &&
			helpers.areAllInteractionsDisconnected(participant.emails) &&
			helpers.areAllInteractionsDisconnected(participant.socialExpressions) &&
			helpers.areAllInteractionsDisconnected(participant.videos))) {
			//console.debug('participant ' + participant.name + ' is connected');
			return false;
		}
		//console.debug('participant ' + participant.name + ' is disconnected');
		return true;
	},
	areAllInteractionsDisconnected: function(interactionsList) {
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
	},
	isParticipantConnected: function(participant) {
		if (helpers.areAnyInteractionsConnected(participant.calls) ||
			helpers.areAnyInteractionsConnected(participant.callbacks) ||
			helpers.areAnyInteractionsConnected(participant.chats) ||
			helpers.areAnyInteractionsConnected(participant.cobrowse) ||
			helpers.areAnyInteractionsConnected(participant.emails) ||
			helpers.areAnyInteractionsConnected(participant.socialExpressions) ||
			helpers.areAnyInteractionsConnected(participant.videos)) {
			return true;
		}
		return false;
	},
	areAnyInteractionsConnected: function(interactionsList) {
		if (!interactionsList) return false;

		var hasConnected = false;
		$.each(interactionsList, function(index, interaction) {
			if (interaction.state.toLowerCase() == 'connected') {
				hasConnected = true;
			}
		});

		return hasConnected;
	},
	formatCellData: function(data, type) {
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
};









