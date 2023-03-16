
const localStorage = chrome.storage.local;
let counter = 0;
let stats = {}
let duration = 0
const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
  
    return hostname;
  };
  
  const setByteLengthPerOrigin = async(origin, byteLength) => {
    // const stats = await localStorage.get(['stats']).key;
    // let stats = {}
    // chrome.storage.local.get(["stats"]).then((result) => {
    //   console.log("Value currently is " + result.key);
    //   stats = result.key && JSON.parse(result.key)
    // });
    // check if it has key, else we would parse the number to "NAN" and we don't want that.
    counter += byteLength;
    const bytePerOrigin = origin in stats ? parseInt(stats[origin]) : 0;
    stats[origin] = bytePerOrigin + byteLength;
    chrome.storage.local.set({ "stats": "hey" }).then(() => {
      console.log("Value is set to " + JSON.stringify(stats));
    });
  };
  
  const isChrome = () => {
    return (typeof(browser) === 'undefined');
  };
  
  const headersReceivedListener = (requestDetails) => {
    if (isChrome()) {
       const origin = extractHostname(!requestDetails.initiator ? requestDetails.url : requestDetails.initiator);
       const responseHeadersContentLength = requestDetails.responseHeaders.find(element => element.name.toLowerCase() === "content-length");
       const contentLength = undefined === responseHeadersContentLength ? {value: 0}
        : responseHeadersContentLength;
       const requestSize = parseInt(contentLength.value, 10);
       setByteLengthPerOrigin(origin, requestSize);
  
       return {};
    }
  
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
  
    filter.ondata = event => {
      const origin = extractHostname(!requestDetails.originUrl ? requestDetails.url : requestDetails.originUrl);
      setByteLengthPerOrigin(origin, event.data.byteLength);
      console.log('event', event)
      filter.write(event.data);
    };
  
    filter.onstop = () => {
      filter.disconnect();
    };
  
    return {};
  };
  
  const setBrowserIcon = (type) => {
    //chrome.browserAction.setIcon({path: `icons/icon-${type}-48.png`});
  };
  
  const addOneMinute = async() => {
    duration++;
    //localStorage.set({duration: duration});
  };
  
  let addOneMinuteInterval;
  
  const handleMessage = (request) => {
    request = {action: "start"};
    if ('start' === request.action) {
    console.log("start");
      setBrowserIcon('on');
  
      chrome.webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
  
      if (!addOneMinuteInterval) {
        addOneMinuteInterval = setInterval(addOneMinute, 60000);
      }
  
      return;
    }
  
    if ('stop' === request.action) {
      setBrowserIcon('off');
      chrome.webRequest.onHeadersReceived.removeListener(headersReceivedListener);
  
      if (addOneMinuteInterval) {
        clearInterval(addOneMinuteInterval);
        addOneMinuteInterval = null;
      }
    }
  };

  const onDisconnect = () => {
    const stringifiedData = JSON.stringify(stats);
    console.log("disconnected")
    chrome.storage.local.set({ "stats": stringifiedData }).then(() => {
      console.log("Value is set to " + stringifiedData);
    });
  }

  chrome.runtime.onConnect.addListener(function(port) {
        port.onDisconnect.addListener(function() {
           onDisconnect();
        });
  });
handleMessage({action: "start"});

const getCurrentCarbonIntensity = () => {
  const response = fetch("localhost:3000")
  .then(response => {
     return response.data;
  })
  .catch(error => {
    console.error("error", error);
      // handle the error
  });
  return response;
}

const intensity = getCurrentCarbonIntensity();

//   chrome.runtime.onMessage.addListener(handleMessage);
// chrome.runtime.sendMessage({ action: 'start' });

  