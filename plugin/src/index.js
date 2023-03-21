let totalBytes = 0;
let carbonUsed = 0;
let stats = {}
let duration = 0
let resetButton;
let readMoreButton;

// keys: ip and size.
let requestMap = new Map();
const localIntensity = 0;

const resetByteTracker = () => {
  console.log("reset");
  stats = {}
  totalBytes = 0;
  
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

  const writeToStorage = () => {
      chrome.storage.sync.set({ "stats": JSON.stringify([...requestMap]) }).then(() => {
        console.log("Set stats: " + JSON.stringify([...requestMap]));
      });
        try {
          const bytesElement = document.getElementById("bytes_used");
        bytesElement.textContent = totalBytes / 1024;
        if (!resetButton) {
          resetButton = document.getElementById("reset_button")
          resetButton.onclick = () => resetByteTracker();
        }
        readMoreButton = document.getElementById("read_more_button")
        readMoreButton.onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('readmore.html') });
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
       const contentLength = responseHeadersContentLength ? responseHeadersContentLength : {value: 0};
        if (contentLength.value > 0) {
          const requestSize = parseInt(contentLength.value, 10);
          const request = {size: requestSize, origin: origin};
          requestMap.set(origin, request);
        }
       return {};
    }
    // not sure if we need this.
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
  
    filter.ondata = event => {
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


 
  const start = () => {
      setBrowserIcon('on');
      chrome.webRequest.onHeadersReceived.addListener(
        headersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
  };

  chrome.webRequest.onResponseStarted.addListener(
    ({ip, ...req}) => {
      const origin = extractHostname(!req.initiator ? req.url : req.initiator);
      const request = requestMap.get(origin);
      if (request) {
        // add ip address to our request.
        request.ip = ip;
        requestMap.set(req.requestId, request);
      }
      console.log(`Network request with ${ip}`);
      console.table("request", req.requestId);
    },
    {urls: ['*://*/*']}
  );

  const getCurrentCarbonIntensity = async(ip, requestId) => {
    try {
    const response = await fetch(`http://localhost:3000/${ip}`);
    const intensity = await response.json();
    const request = requestMap.get(requestId);
      if (request) {
        // add the intensity
        request.intensity = intensity;
        requestMap.set(req.requestId, request);
      }
    } catch(error) {
      console.log("couldn't fetch from backend");
      return 0;
    }
  }

  const setLocalCarbonIntensity = (intensity) => {
    const carbonIntensityElement = document.getElementById("carbon_intensity");
    carbonIntensityElement.textContent = intensity;
  }


  let timer;
  chrome.storage.sync.get(["stats"]).then((result) => {
    if (result.stats && result.stats != "[]") {
      //TODO get local IP address.
      //getCurrentCarbonIntensity();
      console.log('result', result);
      // requestMap = new Map(JSON.parse(result));
      //TODO change this to work with a map.
      // totalBytes = Object.keys(stats).reduce((acc, currentKey) => acc + stats[currentKey], 0);
    }
    start();
    timer = setTimeout(writeToStorage, 1000);
  });


  chrome.runtime.onSuspend.addListener(clearTimeout(timer));