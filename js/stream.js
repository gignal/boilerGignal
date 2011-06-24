
	jQuery(document).ready(function(){ 
		// start
		gig = new Gignal();
		gig.init();
	});

	function Gignal () {
		var host = 'http://gignal.com';
		var cdn_host = 'http://cdn1-g.gignal.com';
		this.eventid = 0;
		this.communicating = false;
		this.video_limit = 0;
		this.image_limit = 0;
		this.message_limit = 0;
		this.firstTime = true;
		this.init = function () {
			this.eventid = jQuery('#gignal-widget').attr('data-eventid');
			this.eventid = parseInt(this.eventid);
			if (this.eventid <= 0) {
				return;
			}
			// insert dummy images
			this.apiParams();
			for (var i = 0; i < this.image_limit; i++) {
				var image = '<a><img src="' + cdn_host + '/img/Gignal-G-dummy.png" /></a>';
				jQuery('#gignal-images').prepend(image);
			}
			// set UUID to keep track of sessions
			this.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			    return v.toString(16);
			});
			this.refresh();
			setInterval(function(){gig.refresh();}, 10000);
			setInterval(function(){relativeTime.iterator();}, 30000);
			this.hoverEffects();
			// below the fold
			var foldPos = 0;
			jQuery(window).scroll(function(){
				var lastNodePos = jQuery('.gignal-status:last-child').offset().top;
				if (lastNodePos == foldPos) {
					return;
				}
				if (jQuery(window).scrollTop() + jQuery(window).height() > lastNodePos) {
					foldPos = lastNodePos;
					loadMore();
				}
			});
		}
		this.apiParams = function () {
			if (jQuery('#gignal-messages').attr('data-limit')) {
				this.message_limit = jQuery('#gignal-messages').attr('data-limit');
			}
			if (jQuery('#gignal-images').attr('data-limit')) {
				this.image_limit = jQuery('#gignal-images').attr('data-limit');
			}
			if (jQuery('#gignal-videos').attr('data-limit')) {
				this.video_limit = jQuery('#gignal-videos').attr('data-limit');
			} else {
				if (jQuery('#gignal-video')) {
					this.video_limit = 1;
				}
			}
			return {
				'uuid': this.uuid,
				'message_limit': this.message_limit,
				'image_limit': this.image_limit,
				'video_limit': this.video_limit
			}
		}
		this.refresh = function () {
			if (gig.communicating) {
				return;
			}
			gig.communicating = true;
			jQuery.ajax({
				url: host + '/api/1/event/' + gig.eventid + '.json',
				data: gig.apiParams(),
				dataType: 'jsonp',
				ifModified: false,
				timeout: 30000,
				error: function () { gig.communicating = false; },
				success: function (data) { gig.parse(data); }
			});
		}
		var loadMore = function () {
			console.log('load more');
		}
		var formatMessage = function (data, source) {
			var logo;
			switch (data.via){
				case 'twitter':
					logo = '<i class="logo twitter"></i>';
					break;
				case 'gowalla':
					logo = '<i class="logo gowalla"></i>';
					break;
				case 'foursquare':
					logo = '<i class="logo foursquare"></i>';
					break;
				case 'facebook':
					logo = '<i class="logo facebook"></i>';
					break;
				default:
					logo = ''
					break;
			}
			var msg = '';
			msg += '<div class="gignal-message {{class}}" id="gignal-message-id-{{id}}">';
			msg += '<div class="gignal-thumbnail"><img src="{{thumbnail}}" alt="" /></div>';
			msg += '<div class="gignal-message-text">';
			msg += '{{#user_link}}<a href="{{{user_link}}}" title="{{name}}">{{/user_link}}<span class="gignal-username">{{username}}</span>{{#user_link}}</a>{{/user_link}}&nbsp;';
			msg += '{{{message}}}';
			msg += '<div class="gignal-quiet">';
			msg += logo;
			msg += '<a href="{{{permalink}}}"><time class="date" datetime="{{datetime}}">{{datetext}}</time></a>';
			if (data.via == 'twitter'){
				msg += '<div class="option-container"><span class="tweet-option hide"><a href="http://twitter.com/intent/tweet?in_reply_to={{source_id}}"><span class="reply"><i></i><b>Reply</b></span></a></span>';
				msg += '<span class="tweet-option hide" style="margin-left:5px"><a href="http://twitter.com/intent/retweet?tweet_id={{source_id}}"><span class="retweet"><i></i><b>Retweet</b></span></a></span>';
				msg += '<span class="tweet-option hide" style="margin-left:5px"><a href="http://twitter.com/intent/favorite?tweet_id={{source_id}}"><span class="fav"><i></i><b>Favorite</b></span></a></span></div>';
			}
			msg += '</div></div></div>';
			return Mustache.to_html(msg, data);
		}
		this.parse = function (data) {
			this.communicating = false;
			if (!data) {
				return;
			}
			if (this.firstTime) {
				jQuery('#ajax-loader').hide();
				jQuery('#gignal-widget').show();
				this.firstTime = false;
			}
			if (jQuery('#gignal-messages').length) {
				for (var i = data.Messages.length - 1; i >= 0; i--) {
					var entry = data.Messages[i];
					if (entry.Node.id == null) {
						continue;
					}
					if (jQuery('#gignal-messages .gignal-message').length - 1 >= jQuery('#gignal-messages').attr('data-limit')) {
						jQuery('#gignal-messages .gignal-message:last-child').remove();
					}
					var image = (entry.Node.source == 'twitter') ? 'http://img.tweetimag.es/i/'+entry.Node.username+'_n' : entry.Node.thumbnail;
					var link = (entry.Node.source == 'twitter') ? 'http://twitter.com/' + entry.Node.username : false;
					var msg = formatMessage({
						'id': entry.Node.id,
						'thumbnail': image,
						'message': twttr.txt.autoLink(entry.Node.body),
						'class': 'gignal-status',
						'user_link': link,
						'name': entry.Node.name,
						'username': entry.Node.username ? entry.Node.username : entry.Node.name,
						'datetime': entry.Node.source_created,
						'datetext': relativeTime.format(entry.Node.source_created),
						'via': entry.Node.source,
						'permalink': entry.Node.permalink,
						'source_id': entry.Node.source_id
						});
					jQuery('#gignal-messages').prepend(jQuery(msg).hide().slideDown('slow'));
				}
			}
			if (jQuery('#gignal-checkins').length) {
				for (var i = data.Checkins.length - 1; i >= 0; i--) {
					var entry = data.Checkins[i];
					if (entry.Checkin.id == null) {
						continue;
					}
					if (jQuery('#gignal-checkins .gignal-message').length == jQuery('#gignal-checkins').attr('data-limit')) {
						jQuery('#gignal-checkins .gignal-message:last-child').remove();
					}
					var msg = formatMessage({
						'id': entry.Checkin.id,
						'thumbnail': entry.Checkin.thumbnail,
						'message': 'checked in',
						'username': entry.Checkin.name,
						'class': 'gignal-checkin',
						'datetime': entry.Checkin.source_created,
						'datetext': relativeTime.format(entry.Checkin.source_created),
						'via': entry.Checkin.source
					});
					jQuery('#gignal-checkins').prepend(jQuery(msg).hide().slideDown('slow'));
				}
			}
			if (jQuery('#gignal-images').length && this.image_limit > 0) {
				// images
				for (var i = data.Images.length - 1; i >= 0; i--) {
					var entry = data.Images[i];
					if (entry.Image.id == null) {
						continue;
					}
					if (jQuery('#gignal-images img').length == this.image_limit) {
						jQuery('#gignal-images a:last-child').remove();
					}
					var image = Mustache.to_html('<a href="{{{link}}}"><img src="{{{src}}}" alt="" data-id="{{id}}" data-imgsrc="{{{large}}}" /></a>', {
						'src': entry.Image.thumbnail,
						'id' : entry.Image.id,
						'link': entry.Image.link,
						'large': entry.Image.large
					});
					jQuery('#gignal-images').prepend(image);
				}
				var ww = jQuery('#gignal-images').width();
				var iw = jQuery('#gignal-images img').width();
				var pr = parseInt(ww / iw);
				var space = (ww - (iw * pr)) / (pr - 1);
				space = parseInt(space);
				jQuery('#gignal-images img').css('margin-right', space);
				//jQuery('#gignal-images img:nth-child('+pr+'n)').css('margin-right', 0);
				//jQuery('#gignal-images img:nth-child(12)').hide();
			}
			/*
			// embedly to the rescue
			if (jQuery('#gignal-video').length) {
				var embed = '<object id="bplayer" data-vid="{{vid}}" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="310" height="267"><embed name="bplayer" src="http://static.bambuser.com/r/player.swf?context=oembed&vid={{vid}}" type="application/x-shockwave-flash" width="310" height="267" allowfullscreen="true" allowscriptaccess="always" wmode="opaque"></embed><param name="movie" value="http://static.bambuser.com/r/player.swf?context=oembed&vid={{vid}}"></param><param name="allowfullscreen" value="true"></param><param name="allowscriptaccess" value="always"></param><param name="wmode" value="opaque"></param></object>';
				var entry = data.Videos[0];
				if (data.Videos.length && entry.Video.id != null) {
					if (jQuery('#gignal-video object').attr('data-vid') != entry.Video.source_id) {
						jQuery('#gignal-video').html(Mustache.to_html(embed, { 'vid': entry.Video.source_id }));
						jQuery('#gignal-video').show();
					}
				}
			}
			*/
			// CSS fix
			jQuery('#gignal-widget .gignal-status').width(jQuery('#gignal-messages').width());
			jQuery('#gignal-widget .gignal-checkin').width(jQuery('#gignal-checkins').width() - 10);
		}
	}

	Gignal.prototype.hoverEffects = function () {
		//Twitter hover options (reply, retweet, favourite)
		jQuery('.gignal-message').live({
			mouseenter: function () {
				jQuery(this).find('span.tweet-option').show();
			},
			mouseleave: function () {
				jQuery(this).find('span.tweet-option').hide();
			}
		});
		jQuery('.tweet-option a span').live({
			mouseenter: function () {
				jQuery(this).find('i').addClass('over');
				jQuery(this).find('b').addClass('over');
			},
			mouseleave: function () {
				jQuery(this).find('i').removeClass('over');
				jQuery(this).find('b').removeClass('over');
			}
		});
	}		

	var relativeTime = {
		iterator: function () {
			jQuery('#gignal-widget time.date').each(function(){
				jQuery(this).text(relativeTime.format(jQuery(this).attr('datetime')));
			});
		},
		format: function (tv) {
			if (typeof tv == 'undefined') {
				return '';
			}
			var t = tv.split(/[- :]/);
			var parsed_date = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
			var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
			var delta = parseInt((relative_to.getTime() - parsed_date) / 1000);
			var timezoneOffset = relativeTime.timezoneOffset();
			delta = timezoneOffset ? delta + timezoneOffset : delta - timezoneOffset;
			if (delta < 60) {
				return parseInt(delta) + ' seconds ago';
			} else if (delta < 120) {
				return 'about a minute ago';
			} else if (delta < (45*60)) {
				return (parseInt(delta / 60)).toString() + ' minutes ago';
			} else if (delta < (1.5*60*60)) {
				return 'about an hour ago';
			} else if (delta < (24*60*60)) {
				return 'about ' + Math.ceil(delta / 3600).toString() + ' hours ago';
			} else if (delta < (48*60*60)) {
				return '1 day ago';
			} else {
				return (parseInt(delta / 86400)).toString() + ' days ago';
			}
		},
		timezoneOffset: function () {
			var d = new Date();
			var localTime = d.getTime();
			var localOffset = d.getTimezoneOffset();
			return (localOffset * 60);
		}
	
	}
