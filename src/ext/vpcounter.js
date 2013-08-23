/*jslint browser:true, devel:true, nomen:true, forin:true, vars:true */
/*globals $, _ */

var x = function (cdbc) {
    "use strict";

    var cardTypes = {};
    cdbc.map(function (card) {
        cardTypes[card.name[0]] = card.type;
    });

    var sum = function (a, b) { return a + b; };
    var cardVPValue = function (card, cardCounts) {
        var c, d = cardCounts;
        switch (card) {
        case 'Dame Josephine':
            return 2; // Not in CardBuilder (Goko bug)
        case 'Duke':
            return d.Duchy || 0;
        case 'Fairgrounds':
            return 2 * Math.floor(_.size(d) / 5);
        case 'Feodum':
            return Math.floor((d.Silver || 0) / 3);
        case 'Gardens':
            return Math.floor(_.values(d).reduce(sum) / 10);
        case 'Silk Road':
            var vpCardCount = 0;
            for (c in d) {
                if (cardTypes[c].match(/victory/)) {
                    vpCardCount += d[c];
                }
            }
            return Math.floor(vpCardCount / 4);
        case 'Vineyard':
            var actionCardCount = 0;
            for (c in d) {
                if (cardTypes[c].match(/action/)) {
                    actionCardCount += d[c];
                }
            }
            return Math.floor(actionCardCount / 3);
        default:
            // Get VP from Goko's CardBuilder data.
            return cardTypes.filter(function (c) {
                return c.name[0] === card;
            })[0].vp;
        }
    };

    var deckVPValue = function (deck) {
        return deck.map(function (card) {
            return cardVPValue(card, deck);
        }).reduce(sum);
    };

    // TODO: do with angular instead (?)
    var pname, pnames = [];
    $('<div id="vpdiv"/>').css('position', 'absolute')
                          .css('padding', '2px')
                          .css('background-color', 'gray');
    $('<table id="vptable"/>').appendTo($('vpdiv'));
    for (pname in pnames) { // TODO
        var pindex = 0; // TODO
        var row = $('<tr/>').attr('id', pname + 'VPRow')
                            .addClass('p' + pindex);
        $('<td/>').text(pname).appendTo(row);
        $('<td/>').attr('id', pname + 'VP').appendTo(row);
        $('#vptable').append(row);
        // TODO: sort on update
    }
};

var loadVPToggleModule = function () {
    "use strict";

    var botadvGame;
    var titleToggle = null;

    // Option describes T1 behavior

    //var respondToVPToggleChat = function (message, sender) {
    //    console.log('Chat from ' + sender + ': ' + message);
    //    // TODO: reply
    //}

    // TODO: intercept #vpon and #vpoff chats when (s !== null) <?>
    // TODO: never lock in games without humans
    // TODO: UI displays VP counter if (s === true) or ((s === null) && (any(p)))
    // TODO: how to reliably detect game start?

    // Tests:
    // 1. Set vp_bot_enable
    //    a. start bot game, verify ON
    //       advance to T5
    //       send #vpoff, verify OFF
    //       send #vpon, verify ON
    //    b. repeat 1a for adventure game
    // 2. Set vp_bot_enable = false
    //    a. start bot game, verify OFF
    //       advance to T5
    //       send #vpon, verify ON
    //       send #vpoff, verify OFF
    //    b. repeat 2a for adventure game
    // 3. Set vp_human_disallow
    //    a. start multiplayer game w/o title, verify OFF
    //       send #vpon/#vpoff, verify OFF and no chat sent
    //       recieve #vpon/#vpoff, verify OFF
    //       advance to T5, verify OFF
    //    b. start multiplayer game with #vpoff in title
    //       send #vpon/#vpoff, verify OFF and no chat sent
    //       recieve #vpon/#vpoff, verify OFF
    //       advance to T5, verify OFF
    //    c. start multiplayer game with #vpon in title
    //       send #vpon/#vpoff, verify ON and no chat sent
    //       recieve #vpon/#vpoff, verify ON
    //       advance to T5, verify ON
    // 4. Set vp_human_request
    //    a. start multiplayer game w/o title, verify OFF
    //       advance to T1, verity #vpon sent
    //
    //
    
    // Cases:
    // Bot Mode:
    // - vp_bot_enable true --> ON
    // - send #vpon --> ON
    // - send #vpoff --> OFF
    // - T5 --> no effect
    // Adv Mode: (same as bot mode)
    // Multiplayer Mode:
    // - title #vpon/#vpoff --> ON/OFF
    //   - vp_human_X --> no effect
    //   - send/receive ANY --> no effect
    // - vp_human_disallow --> OFF, send #vpoff
    //   - send/receive any --> no effect
    // - vp_human_request --> ON, send #vpon
    //   - send/receive #vpoff --> OFF
    //     - any --> no effect
    // - T5 lock
    //   - any --> no effect
    // * test order doesn't matter

    var updateVPCounterToggle = function (messageName, messageData, message, dc) {
        var m, tablename = JSON.parse(dc.table.get('settings')).name;
        var botadvGame = (typeof tablename === 'undefined');

        if (['addLog', 'RoomChat', 'gameSetup'].indexOf(messageName) < 0) {
            return;
        }

        console.log('Message Name: ' + messageName);
        console.log(messageData.text);
        console.log(messageData);

        // TODO: show stating on half-turn after flip

        // advbot game, vp_human_request, vp_human_disallow
        // lastRequest
        // title has #vpon
        // title has #vpoff
        // anyone said #vpoff
        // anyone said #vpon
        //
        // Triggers:
        // my T1 if vp_human_request, vp_human_disallow, vp_bot_enable, titleOn, titleOff
        // any #vpon/#vpoff chat received
        // first T5

        // onUpdate():
        // s = s !== null ? s
        //   : advbotGame ? lastRequest
        //   : title has #vpoff ? false
        //   : title has #vpon ? true
        //   : anyone said #vpoff ? false
        //   : null
        //
        // c = s !== null ? s : anyone said #vpon

        // On my T1:
        //   if advbotGame && vp_bot_enable:
        //     send #vpon
        //   else if s === null:
        //     if vp_human_request:
        //       send #vpon
        //     else if vp_human_disallow:
        //       send #vpoff
        // On any T5:
        //   if s === null
        //     s = c

        // Handle bot/adventure games and #vpon/off in title on first message
        if (messageName === 'gameSetup') {
            console.log(1);
            gs.vp = { s: null, p: [], humanCount: 0};

            if (botadvGame) {
                console.log(2);
                gs.vp.s = gs.get_option('vp_bot_enable') || null;
            } else {
                console.log(3);
                gs.vp.s = tablename.match(/#vpoff/i) ? false
                        : (tablename.match(/#vpon/i) ? true : null);
            }

        } else if (messageName === 'addLog') {
            // Get players from the "starting cards" log entries
            console.log(4);

            m = messageData.text.match(/^(.*) - starting cards/);
            if (m) {
                console.log(5);
                if (!(m[1].match(/^Lord Bottington$/) || m[1].match(/^.* Bot$/))) {
                    console.log(6);
                    gs.vp.humanCount += 1;
                }
            }
        }

        if (gs.vp.s === null) {
            console.log(7);

            // Handle #vpon and #vpoff messages
            if (messageName === 'RoomChat') {
                console.log(8);

                // Any player can unilaterally disable and lock VP counter
                if (messageData.text.match(/#vpoff/i)) {
                    console.log(9);
                    gs.vp.s = false;

                } else if (messageData.text.match(/#vpon/i)) {
                    console.log(10);
                    var speaker = window.mtgRoom.playerList.findByAddress(
                        messageData.playerAddress
                    ).get('playerName');
                    if (gs.vp.p.indexof(speaker) < 0) {
                        gs.vp.p.push(speaker);
                    }
                }

            } else if (messageName === 'addLog') {
                console.log(11);

                // Handle bot games and auto-VP options on player's T1
                m = messageData.text.match('-* (.*): turn 1');
                if (m) {
                    console.log(12);
                    console.log('Turn 1');
                    console.log(m);
                }
                if (m && m[1] === window.mtgRoom.localPlayer.get('playerName')) {
                    console.log(13);
                    if (gs.vp.humanCount === 1 && gs.get_option('vp_bot_enable')) {
                        console.log(14);
                        gs.vp.s = true;
                    } else {
                        console.log(15);
                        if (gs.get_option('vp_human_request') && !botadvGame) {
                            console.log(16);
                            dc.clientConnection.send('sendChat', {text: '#vpon'});
                        } else if (gs.get_option('vp_human_disallow') && !botadvGame) {
                            console.log(17);
                            gs.vp.s = false;
                            dc.clientConnection.send('sendChat', {text: '#vpoff'});
                        }
                    }
                }

                // Lock on anyone's T5
                m = messageData.text.match('.*: turn 5');
                if (m) {
                    console.log(18);
                    console.log('Turn 5');
                    gs.vp.s = gs.vp.p.length > 0;
                }
            }
        }
    };

    // Hijack server messages to handle VP counter toggling
    dc.prototype.onIncomingMessage_orig = dc.prototype.onIncomingMessage;
    dc.prototype.onIncomingMessage = function (messageName, messageData, message) {
        try {
            updateVPCounterToggle(messageName, messageData, message, this);
        } catch (e) {
            console.log('Error while updating VP counter toggle');
            console.log(e.message);
        } finally {
            // Process server message like normal
            this.onIncomingMessage_orig.apply(this, arguments);
        }
    };
};
