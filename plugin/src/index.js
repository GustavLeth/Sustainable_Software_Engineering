const localStorage = chrome.storage.local;
let totalBytes = 0;
let stats = {}
let duration = 0
let resetButton;
const resetByteTracker = () => {
  console.log("reset");
  stats = {}
  counter = 0;
  chrome.storage.sync.set({ "stats": JSON.stringify({}) }).then(() => {
    console.log("Set stats: " + JSON.stringify({}));
  });
};

const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
  
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
  
    return hostname;
  };
  
  const setByteLengthPerOrigin = async(origin, byteLength) => {
    // check if it has key, else we would parse the number to "NAN" and we don't want that.
    totalBytes += byteLength;
    console.log('totalBytes', totalBytes);
    console.log('origin', origin)
    const bytePerOrigin = origin in stats ? parseInt(stats[origin]) : 0;
    stats[origin] = bytePerOrigin + byteLength;
  };

  const writeToStorage = () => {
      chrome.storage.sync.set({ "stats": JSON.stringify(stats) }).then(() => {
        console.log("Set stats: " + JSON.stringify(stats));
      });
        try {
          const bytesElement = document.getElementById("bytes_used");
        bytesElement.textContent = totalBytes / 1024;
        if (!resetButton) {
          resetButton = document.getElementById("reset_button")
          resetButton.onclick = () => resetByteTracker();
        }
        } catch (error) {
        console.log("document not defined");
      }
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

  const extractIPAddress = req => {

  }
 
  const start = () => {
      setBrowserIcon('on');
      chrome.webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
  };

  chrome.webRequest.onCompleted.addListener(
    extractIPAddress,
    {},
    [],
  );

  const getCurrentCarbonIntensity = async() => {
    try {
    const response = await fetch("http://localhost:3000");
    const intensity = await response.json();
    console.log('intensity', intensity)
    const carbonIntensityElement = document.getElementById("carbon_intensity");
    carbonIntensityElement.textContent = intensity;
    } catch(error) {
      console.log("couldn't fetch from backend");
      return 0;
    }
  }


let timer;
  chrome.storage.sync.get(["stats"]).then((result) => {
    getCurrentCarbonIntensity();
    stats = JSON.parse(result["stats"]) ?? {};
    totalBytes = Object.keys(stats).reduce((acc, currentKey) => acc + stats[currentKey], 0);
    start();
    timer = setTimeout(writeToStorage, 3000);
  });

  chrome.runtime.onSuspend.addListener(clearTimeout(timer));

  