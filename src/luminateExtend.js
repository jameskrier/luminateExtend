/*
 * luminateExtend.js
 * Version: 1.0 (21-SEP-2012)
 * Requires: jQuery v1.7+
 * Includes: SimpleDateFormatJS v1.0 (https://github.com/noahcooper/SimpleDateFormatJS)
 */

(function($) {
  /* private helper functions */
  var stringToObj = function(str, obj) {
    obj = obj || window;
    var objReturn = obj;
    
    if(str) {
      var strParts = str.split('.');
      for(i = 0; i < strParts.length; i++) {
        if(i < (strParts.length - 1) && !objReturn[strParts[i]]) {
          objReturn[strParts[i]] = {};
        }
        objReturn = objReturn[strParts[i]];
      }
    }
    
    return objReturn;
  }, 
  
  buildServerUrl = function(useHTTPS, data) {
    var serverUrl = ((useHTTPS) ? (luminateExtend.global.path.secure + 'S') : luminateExtend.global.path.nonsecure) + 
                    'PageServer?pagename=luminateExtend_server&pgwrap=n' + 
                    ((luminateExtend.global.sessionCookie) ? ('&' + luminateExtend.global.sessionCookie) : '') + 
                    ((data) ? ('&' + data) : '');
    return serverUrl;
  };  
  
  /* library core */
  window.luminateExtend = function(initOptions) {
    /* make luminateExtend an alias for the init method if called directly */
    if(initOptions) {
      luminateExtend.init(initOptions);
    }
  };
  
  /* library info */
  luminateExtend.library = {
    version: '1.0'
  };
  
  /* global settings */
  luminateExtend.global = {
    update: function(settingName, settingValue) {
      if(settingName) {
        if(settingName.length) {
          luminateExtend.global[settingName] = settingValue;
        }
        else {
          luminateExtend.global = $.extend(luminateExtend.global, settingName);
        }
      }
    }
  };
  
  /* init library */
  luminateExtend.init = function(options) {
    var settings = $.extend({
      apiCommon: {
        categoryId: null, 
        centerId: null, 
        source: null, 
        subSource: null
      }, 
      apiKey: null, 
      auth: {
        token: null, 
        type: 'auth'
      }, 
      locale: null, 
      path: {
        nonsecure: null, 
        secure: null
      }
    }, options || {});
    
    if(settings.locale != null && settings.locale != 'es_US' && settings.locale != 'en_CA' && 
       settings.locale != 'fr_CA' && settings.locale != 'en_GB') {
      settings.locale = 'en_US';
    }
    if(settings.locale != null) {
      luminateExtend.sessionVars.set('locale', settings.locale);
    }
    
    luminateExtend.global = $.extend(luminateExtend.global, settings);
    
    return luminateExtend;
  };
  
  /* api core */
  luminateExtend.api = {
    bind: function(selector) {
      selector = selector || 'form.luminateApi';
      
      if($(selector).length > 0) {
        $(selector).each(function() {
          if(this.nodeName.toLowerCase() == 'form') {
            $(this).on('submit', function(e) {
              e.cancelBubble = true;
              e.returnValue  = false;
              if(e.stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
              }
              
              var submitTimestamp = new Date().getTime();
              
              if(!$(this).attr('id')) {
                $(this).attr('id', 'luminateApi-' + submitTimestamp);
              }
              
              var formAction = $(this).attr('action'), 
              formActionQuery = formAction.split('?'), 
              formApiData = $(this).data('luminateapi'), 
              
              requestApi = (formActionQuery[0].indexOf('/site/') != -1) ? 
                           formActionQuery[0].split('/site/')[1] : formActionQuery[0], 
              requestCallback = null, 
              requestContentType = $(this).attr('enctype'), 
              requestData = (formActionQuery.length > 1) ? formActionQuery[1] : '', 
              requestForm = '#' + $(this).attr('id'), 
              requestRequiresAuth = false, 
              requestType = $(this).attr('method'), 
              requestUseHTTPS = false;
              
              if(formApiData) {
                if(formApiData.callback) {
                  requestCallback = stringToObj(formApiData.callback);
                }
                if(formApiData.requiresAuth && formApiData.requiresAuth == 'true') {
                  requestRequiresAuth = true;
                }
                if(formAction.indexOf('https:') == 0 || 
                   (window.location.protocol == 'https:' && formAction.indexOf('http') == -1)) {
                  requestUseHTTPS = true;
                }
              }
              
              luminateExtend.api.request({
                api: requestApi, 
                callback: requestCallback, 
                contentType: requestContentType, 
                data: requestData, 
                form: requestForm,  
                requestType: requestType, 
                requiresAuth: requestRequiresAuth, 
                useHTTPS: requestUseHTTPS
              });
            });
          }
        });
      }
      
      return luminateExtend;
    }, 
    
    getAuth: function(options) {
      /* don't try to get an auth token if there's already a request outstanding */
      if(luminateExtend.api.getAuthLoad) {
        luminateExtend.api.getAuthLoad = false;
        
        var settings = $.extend({
          callback: null, 
          returnLib: true, 
          useHTTPS: false
        }, options || {});
        
        $.ajax({
          dataType: 'jsonp', 
          success: function(data) {
            luminateExtend.global.update(data);
            luminateExtend.api.getAuthLoad = true;
            
            if(settings.callback != null) {
              settings.callback();
            }
            
            if(settings.returnLib) {
              return luminateExtend;
            }
          }, 
          url: buildServerUrl(settings.useHTTPS, 'action=getAuth&callback=?')
        });
      }
      else {
        var retryGetAuth = function() {
          luminateExtend.api.getAuth(options); 
        }, 
        t = setTimeout(retryGetAuth, 1000);
      }
    }, 
    
    getAuthLoad: true, 
    
    request: function(options) {
      var settings = $.extend({
        api: null, 
        callback: null, 
        contentType: 'application/x-www-form-urlencoded', 
        data: '', 
        form: null, 
        requestType: 'GET', 
        requiresAuth: false, 
        useHashTransport: false, 
        useHTTPS: null
      }, options || {});
      
      switch(settings.api.toLowerCase()) {
        case 'addressbook':
          settings.api = 'CRAddressBookAPI';
          break;
        case 'advocacy':
          settings.api = 'CRAdvocacyAPI';
          break;
        case 'connect':
          settings.api = 'CRConnectAPI';
          break;
        case 'cons':
          settings.api = 'CRConsAPI';
          break;
        case 'content':
          settings.api = 'CRContentAPI';
          break;
        case 'datasync':
          settings.api = 'CRDataSyncAPI';
          break;
        case 'donation':
          settings.api = 'CRDonationAPI';
          break;
        case 'event':
          settings.api = 'CROrgEventAPI';
          break;
        case 'group':
          settings.api = 'CRGroupAPI';
          break;
        case 'orgevent':
          settings.api = 'CROrgEventAPI';
          break;
        case 'recurring':
          settings.api = 'CRRecurringAPI';
          break;
        case 'survey':
          settings.api = 'CRSurveyAPI';
          break;
        case 'teamraiser':
          settings.api = 'CRTeamraiserAPI';
          break;
      }
      
      if(settings.contentType != 'multipart/form-data') {
        settings.contentType = 'application/x-www-form-urlencoded';
      }
      
      settings.data = 'luminateExtend=true' + ((settings.data == '') ? '' : ('&' + settings.data));
      
      if(settings.form != null && $(settings.form).length > 0) {
        settings.data += '&' + $(settings.form).eq(0).serialize();
      }
      if(settings.data.indexOf('&api_key=') == -1) {
        settings.data += '&api_key=' + luminateExtend.global.apiKey;
      }
      if(luminateExtend.global.apiCommon.centerId != null && settings.data.indexOf('&center_id=') == -1) {
        settings.data += '&center_id=' + luminateExtend.global.apiCommon.centerId;
      }
      if(luminateExtend.global.categoryId != null && settings.data.indexOf('&list_category_id=') == -1) {
        settings.data += '&list_category_id=' + luminateExtend.global.apiCommon.categoryId;
      }
      if(settings.data.indexOf('&response_format=xml') != -1) {
        settings.data = settings.data.replace(/&response_format=xml/g, '&response_format=json');
      }
      else if(settings.data.indexOf('&response_format=') == -1) {
        settings.data += '&response_format=json';
      }
      if(luminateExtend.global.source != null && settings.data.indexOf('&source=') == -1) {
        settings.data += '&source=' + luminateExtend.global.apiCommon.source;
      }
      if(luminateExtend.global.subSource != null && settings.data.indexOf('&sub_source=') == -1) {
        settings.data += '&sub_source=' + luminateExtend.global.apiCommon.subSource;
      }
      if(settings.data.indexOf('&suppress_response_codes=') == -1) {
        settings.data += '&suppress_response_codes=true';
      }
      if(settings.data.indexOf('&v=') == -1) {
        settings.data += '&v=1.0';
      }
      
      if(settings.requestType.toLowerCase() == 'post') {
        settings.requestType = 'POST';
      }
      else {
        settings.requestType = 'GET';
      }
      
      var requestUrl = 'http://', 
      requestPath = luminateExtend.global.path.nonsecure.split('http://')[1];
      if(settings.api == 'CRDonationAPI' || settings.api == 'CRTeamraiserAPI' || 
         (settings.api != 'CRConnectAPI' && ((window.location.protocol == 'https:' && 
          settings.useHTTPS == null) || settings.useHTTPS == true))) {
        settings.useHTTPS = true;
      }
      else {
        settings.useHTTPS = false;
      }
      if(settings.useHTTPS) {
        requestUrl = 'https://', 
        requestPath = luminateExtend.global.path.secure.split('https://')[1];
      }
      requestUrl += requestPath + settings.api;
      
      var isLuminateOnlineAndSameProtocol = false, 
      useAjax = false, 
      usePostMessage = false;
      if(window.location.protocol == requestUrl.split('//')[0] && document.domain == requestPath.split('/')[0] && !settings.useHashTransport) {
        isLuminateOnlineAndSameProtocol = true, 
        useAjax = true;
      }
      else {
        var requestXHR = new XMLHttpRequest();
        /* don't use AJAX if auth is required as API does not send Access-Control-Allow-Credentials 
           response header needed to make use of CORS withCredentials (E-61857) */
        if('withCredentials' in requestXHR && !settings.requiresAuth && 
           !((settings.data.indexOf('&method=login') != -1 && 
              settings.data.indexOf('&method=loginTest') == -1) || 
             settings.data.indexOf('&method=logout') != -1) && !settings.useHashTransport) {
          useAjax = true;
        }
        else if('postMessage' in window && !settings.useHashTransport) {
          usePostMessage = true;
        }
      }
      
      var doRequest;
      if(useAjax) {
        doRequest = function() {
          var ajaxTimestamp = new Date().getTime();
          
          if(settings.requiresAuth && settings.data.indexOf('&' + luminateExtend.global.auth.type + '=') == -1) {
            settings.data += '&' + luminateExtend.global.auth.type + '=' + luminateExtend.global.auth.token;
          }
          settings.data += '&' + luminateExtend.global.sessionCookie + '&ts=' + ajaxTimestamp;
          
          $.ajax({
            contentType: settings.contentType, 
            data: settings.data, 
            /* set dataType explicitly as API sends Content-Type: text/plain rather than 
               application/json (E-62659) */
            dataType: 'json', 
            success: function(data) {
              var callbackFn;
              if(settings.callback != null) {
                callbackFn = settings.callback;
                if(settings.callback.error && data.errorResponse) {
                  callbackFn = settings.callback.error;
                }
                else if(settings.callback.success) {
                  callbackFn = settings.callback.success;
                }
              }
              
              /* get a new auth token after login or logout */
              if(!((settings.data.indexOf('&method=login') != -1 && 
                   settings.data.indexOf('&method=loginTest') == -1) || 
                  settings.data.indexOf('&method=logout') != -1)) {
                if(callbackFn) {
                  callbackFn(data);
                }
                
                return luminateExtend;
              }
              else {
                var newAuthCallback = function() {
                  callbackFn(data);
                };
                luminateExtend.api.getAuth({
                  callback: newAuthCallback, 
                  useHTTPS: settings.useHTTPS
                });
              }
            }, 
            type: settings.requestType, 
            url: requestUrl
          });
        };
      }
      else if(usePostMessage) {
        doRequest = function() {
          var postMessageTimestamp = new Date().getTime(), 
          postMessageFrameId = 'luminateApiPostMessage' + postMessageTimestamp, 
          postMessageUrl = buildServerUrl(settings.useHTTPS, 'action=postMessage');
          
          if(settings.requiresAuth && settings.data.indexOf('&' + luminateExtend.global.auth.type + '=') == -1) {
            settings.data += '&' + luminateExtend.global.auth.type + '=' + luminateExtend.global.auth.token;
          }
          settings.data += '&' + luminateExtend.global.sessionCookie + '&ts=' + postMessageTimestamp;
          
          if(!luminateExtend.api.request.postMessageEventHandler) {
            luminateExtend.api.request.postMessageEventHandler = {};
            
            luminateExtend.api.request.postMessageEventHandler.handler = function(e) {
              var parsedData = $.parseJSON(e.data), 
              messageFrameId = parsedData.postMessageFrameId, 
              responseData = $.parseJSON(decodeURIComponent(parsedData.response));
              
              if(luminateExtend.api.request.postMessageEventHandler[messageFrameId]) {
                luminateExtend.api.request.postMessageEventHandler[messageFrameId](messageFrameId, responseData);
              }
            };
            
            if(typeof window.addEventListener != 'undefined') {
              window.addEventListener('message', luminateExtend.api.request.postMessageEventHandler.handler);
            }
            else if(typeof window.attachEvent != 'undefined') {
              window.attachEvent('onmessage', luminateExtend.api.request.postMessageEventHandler.handler);
            }
          }
          
          luminateExtend.api.request.postMessageEventHandler[postMessageFrameId] = function(frameId, data) {
            var callbackFn;
            if(settings.callback != null) {
              callbackFn = settings.callback;
              if(settings.callback.error && data.errorResponse) {
                callbackFn = settings.callback.error;
              }
              else if(settings.callback.success) {
                callbackFn = settings.callback.success;
              }
            }
            
            /* get a new auth token after login or logout */
            if(!((settings.data.indexOf('&method=login') != -1 && 
                  settings.data.indexOf('&method=loginTest') == -1) || 
                 settings.data.indexOf('&method=logout') != -1)) {
              if(callbackFn) {
                callbackFn(data);
              }
              
              return luminateExtend;
            }
            else {
              var newAuthCallback = function() {
                callbackFn(data);
              };
              luminateExtend.api.getAuth({
                callback: newAuthCallback, 
                useHTTPS: settings.useHTTPS
              });
            }
            
            $('#' + frameId).remove();
                
            delete luminateExtend.api.request.postMessageEventHandler[frameId];
          };
          
          $('body').append('<iframe style="position: absolute; top: 0; left: -999em;" ' + 
                           'name="' + postMessageFrameId + '" id="' + postMessageFrameId + '">' +  
                           '</iframe>');
          
          $('#' + postMessageFrameId).on('load', function() {
            var postMessageString = '{' + 
                                      '"postMessageFrameId": "' + $(this).attr('id') + '", ' + 
                                      '"requestUrl": "' + requestUrl + '", ' + 
                                      '"requestContentType": "' + settings.contentType + '", ' + 
                                      '"requestData": "' + settings.data + '", ' + 
                                      '"requestType": "' + settings.requestType + '"' + 
                                    '}', 
            postMessageOrigin = requestUrl.split('/site/')[0];
            
            document.getElementById($(this).attr('id')).contentWindow
            .postMessage(postMessageString, postMessageOrigin);
          });
          
          $('#' + postMessageFrameId).attr('src', postMessageUrl);
        };
      }
      else {
        doRequest = function() {
          var hashTransportTimestamp = new Date().getTime(), 
          hashTransportFrameId = 'luminateApiHashTransport' + hashTransportTimestamp, 
          hashTransportUrl = buildServerUrl(settings.useHTTPS, 'action=hashTransport'), 
          hashTransportClientUrl = window.location.protocol + '//' + document.domain + 
                                   '/luminateExtend_client.html';
          
          if(settings.requiresAuth && settings.data.indexOf('&' + luminateExtend.global.auth.type + '=') == -1) {
            settings.data += '&' + luminateExtend.global.auth.type + '=' + luminateExtend.global.auth.token;
          }
          settings.data += '&' + luminateExtend.global.sessionCookie + '&ts=' + hashTransportTimestamp;
          
          hashTransportUrl += '#&hashTransportClientUrl=' + encodeURIComponent(hashTransportClientUrl) + 
                              '&hashTransportFrameId=' + hashTransportFrameId + '&requestUrl=' + 
                              encodeURIComponent(requestUrl) + '&requestContentType=' + 
                              encodeURIComponent(settings.contentType) + '&requestData=' + 
                              encodeURIComponent(settings.data) + '&requestType=' + 
                              settings.requestType;
          
          if(!luminateExtend.api.request.hashTransportEventHandler) {
            luminateExtend.api.request.hashTransportEventHandler = {};
            
            luminateExtend.api.request.hashTransportEventHandler.handler = function(frameId, data) {
              if(luminateExtend.api.request.hashTransportEventHandler[frameId]) {
                luminateExtend.api.request.hashTransportEventHandler[frameId](frameId, data);
              }
            };
          }
          
          luminateExtend.api.request.hashTransportEventHandler[hashTransportFrameId] = function(frameId, data) {
            if(settings.callback != null) {
              var callbackFn = settings.callback;
              if(settings.callback.error && data.errorResponse) {
                callbackFn = settings.callback.error;
              }
              else if(settings.callback.success) {
                callbackFn = settings.callback.success;
              }
              callbackFn(data);
              
              return luminateExtend;
            }
            
            $('#' + frameId).remove();
            
            delete luminateExtend.api.request.hashTransportEventHandler[frameId];
          };
          
          $('body').append('<iframe style="position: absolute; top: 0; left: -999em;" ' + 
                           'name="' + hashTransportFrameId + '" id="' + hashTransportFrameId + '" ' + 
                           'src="' + hashTransportUrl + '"></iframe>');
        };
      }
      
      var getAuthToken = false;
      if(settings.requiresAuth && luminateExtend.global.auth.token == null) {
        getAuthToken = true;
      }
      else if(!isLuminateOnlineAndSameProtocol && luminateExtend.global.sessionCookie == null) {
        getAuthToken = true;
      }
      
      if(getAuthToken) {
        luminateExtend.api.getAuth({
          callback: doRequest, 
          returnLib: false, 
          useHTTPS: settings.useHTTPS
        });
      }
      else {
        doRequest();
      }
    }
  };
  
  /* session variables */
  luminateExtend.sessionVars = {
    set: function(varName, varValue, callback) {
      var pingOptions = {};
      if(callback) {
        pingOptions.callback = callback;
      }
      if(varName) {
        pingOptions.data = 's_' + varName + '=' + ((varValue) ? varValue : '');
        
        luminateExtend.utils.ping(pingOptions);
      }
    }
  };
  
  /* public helper functions */
  luminateExtend.utils = {
    /* ensure an object is an array so it may be iterated over, i.e. using $.each(), as the API uses an 
       array if there are 2 or more instances of an object, but does not use an array if there is 
       exactly 1 (E-47741) */
    ensureArray: function(pArray) {
      if($.isArray(pArray)) {
        return pArray;
      }
      else {
        return [pArray];
      }
    }, 
    
    ping: function(options) {
      var settings = $.extend({
        callback: null, 
        data: null
      }, options || {});
      
      var pingTimestamp = new Date().getTime(), 
      pingImgId = 'luminatePing' + pingTimestamp, 
      pingUrl = ((window.location.protocol == 'https:') ? luminateExtend.global.path.secure : 
                 luminateExtend.global.path.nonsecure) + 'PixelServer' + 
                ((settings.data == null) ? '' : ('?' + settings.data));
      
      $('body').append('<img style="position: absolute; left: -999em; top: 0;" ' + 
                       'id="' + pingImgId + '" />');
      
      $('#' + pingImgId).on('load', function() {
        $(this).remove();
        
        if(settings.callback != null) {
          settings.callback();
        }
        
        return luminateExtend;
      });
      
      $('#' + pingImgId).attr('src', pingUrl);
    }, 
    
    simpleDateFormat: function(unformattedDate, pattern, locale) {
      locale = locale || luminateExtend.global.locale;
      locale = (locale == 'es_US' || locale == 'en_CA' || locale == 'fr_CA' || 
                locale == 'en_GB') ? locale : 'en_US';
      pattern = pattern || ((this.locale == 'en_CA' || this.locale == 'fr_CA' || 
                             this.locale == 'en_GB') ? 'd/M/yy' : 'M/d/yy');
      unformattedDate = unformattedDate || new Date();
      if(!(unformattedDate instanceof Date)) { 
        var unformattedDateParts = unformattedDate.split('T')[0].split('-'), 
        unformattedDateTimeParts = (unformattedDate.split('T').length > 1) ? unformattedDate.split('T')[1]
                                                                                            .split('.')[0]
                                                                                            .split('Z')[0]
                                                                                            .split('-')[0]
                                                                                            .split(':') 
                                                                           : ['00', '00', '00'];
        unformattedDate = new Date(unformattedDateParts[0], (unformattedDateParts[1] - 1), 
                                   unformattedDateParts[2], unformattedDateTimeParts[0], 
                                   unformattedDateTimeParts[1], unformattedDateTimeParts[2]);
      }
      
      var oneDigitNumber = function(num) {
        num = '' + num;
        return (num.indexOf('0') == 0 && num != '0') ? num.substring(1) : num;
      };
      
      var twoDigitNumber = function(num) {
        num = Number(num);
        return (isNaN(num)) ? '00' : (((num < 10) ? '0' : '') + num);
      };
      
      var dateParts = {
        month: twoDigitNumber(unformattedDate.getMonth() + 1), 
        date: twoDigitNumber(unformattedDate.getDate()), 
        year: twoDigitNumber(unformattedDate.getFullYear()), 
        day: unformattedDate.getDay(), 
        hour24: unformattedDate.getHours(), 
        hour12: unformattedDate.getHours(), 
        minutes: twoDigitNumber(unformattedDate.getMinutes()), 
        ampm: 'AM'
      };
      if(dateParts.hour24 > 11) {
        dateParts.ampm = 'PM';
      }
      dateParts.hour24 = twoDigitNumber(dateParts.hour24);
      if(dateParts.hour12 == 0) {
        dateParts.hour12 = 12;
      }
      if(dateParts.hour12 > 12) {
        dateParts.hour12 = dateParts.hour12 - 12;
      }
      dateParts.hour12 = twoDigitNumber(dateParts.hour12);
      
      var formattedDate;
      
      var patternReplace = function(patternPart) {
        var patternPartFormatted = patternPart.replace(/yy+(?=y)/g, 'yy')
                                              .replace(/MMM+(?=M)/g, 'MMM')
                                              .replace(/d+(?=d)/g, 'd')
                                              .replace(/EEE+(?=E)/g, 'EEE')
                                              .replace(/a+(?=a)/g, '')
                                              .replace(/k+(?=k)/g, 'k')
                                              .replace(/h+(?=h)/g, 'h')
                                              .replace(/m+(?=m)/g, 'm');
        
        var formattedPart = patternPartFormatted.replace(/yyy/g, dateParts.year)
                                                .replace(/yy/g, dateParts.year.substring(2))
                                                .replace(/y/g, dateParts.year)
                                                .replace(/dd/g, dateParts.date)
                                                .replace(/d/g, oneDigitNumber(dateParts.date)), 
        
        adjustTimePattern = function(timeParts, timePatternPart, operator) {
          for(i = 1; i < timeParts.length; i++) {
            if(!isNaN(timeParts[i].substring(0, 1))) {
              var timePartOperand = timeParts[i].substring(0, 2);
              timeParts[i] = timeParts[i].substring(2);
              if(isNaN(timePartOperand.substring(1))) {
                timeParts[i] = timePartOperand.substring(1) + timeParts[i];
                timePartOperand = timePartOperand.substring(0, 1);
              }
              timePartOperand = Number(timePartOperand);
              if(timePartOperand > 23) {
                timePartOperand = 23;
              }
              
              var timePartResult = (operator == '+') ? timePartOperand : (0 - timePartOperand);
              if(timePatternPart == 'kk' || timePatternPart == 'k') {
                timePartResult = (Number(dateParts.hour24) + timePartResult);
                if(timePartResult > 24) {
                  timePartResult = timePartResult - 24;
                }
                else if(timePartResult < 0) {
                  timePartResult = timePartResult + 24;
                }
              }
              else {
                timePartResult = (Number(dateParts.hour12) + timePartResult);
                if(timePartResult > 24) {
                  timePartResult = timePartResult - 24;
                }
                else if(timePartResult < 0) {
                  timePartResult = timePartResult + 24;
                }
                if(timePartResult > 12) {
                  timePartResult = timePartResult - 12;
                }
              }
              timePartResult = '' + timePartResult;
              if(timePatternPart == 'kk' || timePatternPart == 'hh') {
                timePartResult = twoDigitNumber(timePartResult);
              }
              if((timePatternPart == 'h' && timePartResult == 0) || (timePatternPart == 'hh' && 
                 timePartResult == '00')) {
                timePartResult = '12';
              }
              timeParts[i] = timePartResult + timeParts[i];
            }
          }
          
          return timeParts.join('');
        };
        
        if(formattedPart.indexOf('k+') != -1) {
          formattedPart = adjustTimePattern(formattedPart.split('kk+'), 'kk', '+');
          formattedPart = adjustTimePattern(formattedPart.split('k+'), 'k', '+');
        }
        if(formattedPart.indexOf('k-') != -1) {
          formattedPart = adjustTimePattern(formattedPart.split('kk-'), 'kk', '-');
          formattedPart = adjustTimePattern(formattedPart.split('k-'), 'k', '-');
        }
        
        formattedPart = formattedPart.replace(/kk/g, dateParts.hour24)
                                     .replace(/k/g, oneDigitNumber(dateParts.hour24));
        
        if(formattedPart.indexOf('h+') != -1) {
          formattedPart = adjustTimePattern(formattedPart.split('hh+'), 'hh', '+');
          formattedPart = adjustTimePattern(formattedPart.split('h+'), 'h', '+');
        }
        if(formattedPart.indexOf('h-') != -1) {
          formattedPart = adjustTimePattern(formattedPart.split('hh-'), 'hh', '-');
          formattedPart = adjustTimePattern(formattedPart.split('h-'), 'h', '-');
        }
        
        formattedPart = formattedPart.replace(/hh/g, ((dateParts.hour12 < 12 && dateParts.hour12.indexOf && 
                                                       dateParts.hour12.indexOf('0') != 0) ? ('0' + 
                                                       dateParts.hour12) : 
                                                      dateParts.hour12))
                                     .replace(/h/g, oneDigitNumber(dateParts.hour12));
        
        formattedPart = formattedPart.replace(/mm/g, dateParts.minutes)
                                     .replace(/m/g, oneDigitNumber(dateParts.minutes));
        
        formattedPart = formattedPart.replace(/a/g, 'A');
        
        var formattedMonthNames = ['January', 
                                   'February', 
                                   'march', 
                                   'april', 
                                   'may', 
                                   'June', 
                                   'July', 
                                   'august', 
                                   'September', 
                                   'October', 
                                   'November', 
                                   'December'];
        if(locale == 'es_US') {
          formattedMonthNames = ['enero', 
                                 'febrero', 
                                 'marzo', 
                                 'abril', 
                                 'mayo', 
                                 'junio', 
                                 'julio', 
                                 'agosto', 
                                 'septiembre', 
                                 'octubre', 
                                 'noviembre', 
                                 'diciembre'];
        }
        if(locale == 'fr_CA') {
          formattedMonthNames = ['janvier', 
                                 'f&#233;vrier', 
                                 'mars', 
                                 'avril', 
                                 'mai', 
                                 'juin', 
                                 'juillet', 
                                 'ao&#251;t', 
                                 'septembre', 
                                 'octobre', 
                                 'novembre', 
                                 'd&#233;cembre'];
        }
        formattedPart = formattedPart.replace(/MMMM/g, formattedMonthNames[Number(dateParts.month) - 1])
                                     .replace(/MMM/g, formattedMonthNames[Number(dateParts.month) - 1]
                                                      .substring(0, 3))
                                     .replace(/MM/g, dateParts.month)
                                     .replace(/M/g, oneDigitNumber(dateParts.month))
                                     .replace(/march/g, 'March')
                                     .replace(/may/g, 'May');
        
        var formattedDayNames = ['Sunday', 
                                 'Monday', 
                                 'Tuesday', 
                                 'Wednesday', 
                                 'Thursday', 
                                 'Friday', 
                                 'Saturday'];
        if(locale == 'es_US') {
          formattedDayNames = ['domingo', 
                               'lunes', 
                               'martes', 
                               'mi&eacute;rcoles', 
                               'jueves', 
                               'viernes', 
                               's&aacute;bado'];
        }
        if(locale == 'fr_CA') {
          formattedDayNames = ['dimanche', 
                               'lundi', 
                               'mardi', 
                               'mercredi', 
                               'jeudi', 
                               'vendredi', 
                               'samedi'];
        }
        formattedPart = formattedPart.replace(/EEEE/g, formattedDayNames[dateParts.day])
                                     .replace(/EEE/g, formattedDayNames[dateParts.day].substring(0, 3))
                                     .replace(/EE/g, formattedDayNames[dateParts.day].substring(0, 3))
                                     .replace(/E/g, formattedDayNames[dateParts.day].substring(0, 3));
        
        formattedPart = formattedPart.replace(/A/g, dateParts.ampm)
                                     .replace(/april/g, 'April')
                                     .replace(/august/g, 'August');
        
        return formattedPart;
      };
      
      if(pattern.indexOf('\'') == -1) {
        formattedDate = patternReplace(pattern);
      }
      
      else {
        var formatPatternParts = pattern.replace(/\'+(?=\')/g, '\'\'').split('\'\'');
        if(formatPatternParts.length == 1) {
          formatPatternParts = pattern.split('\'');
          for(i = 0; i < formatPatternParts.length; i++) {
            if(i % 2 == 0) {
              formatPatternParts[i] = patternReplace(formatPatternParts[i]);
            }
          }
          return formatPatternParts.join('');
        }
        else {
          for(i = 0; i < formatPatternParts.length; i++) {
            formatPatternParts2 = formatPatternParts[i].split('\'');
            for(j = 0; j < formatPatternParts2.length; j++) {
              if(j % 2 == 0) {
                formatPatternParts2[j] = patternReplace(formatPatternParts2[j]);
              }
            }
            formatPatternParts[i] = formatPatternParts2.join('');
          }
          return formatPatternParts.join('\'');
        }
      }
      
      return formattedDate;
    }
  };
})(jQuery);