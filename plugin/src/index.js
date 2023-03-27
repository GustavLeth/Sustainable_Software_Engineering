let localIntensity;
let requestMap = new Map();
// TODO this could probably be improved
const privateIps = ["10.0.0", "172.16.0", "192.168.0", "127.0.0", "169.254.0"]

const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
    return hostname;
  };

  const writeToStorage = () => {
      chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap]) });
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
          const currentSize = requestMap.has(origin) ? requestMap.get(origin).size : 0;
          const requestSize = parseInt(contentLength.value, 10) + currentSize;
          const request = {size: requestSize, origin: origin};
          requestMap.set(origin, request);
        }
        return;
    }
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
  // extracts the ip and the intensity and puts it in the map-
  chrome.webRequest.onResponseStarted.addListener(
    async({ip, ...req}) => {
      const origin = extractHostname(!req.initiator ? req.url : req.initiator);
      const request = requestMap.get(origin);
      if (request) {
        // add ip address to our request.
        request.ip = ip;
        if (!Object.keys(request).includes("intensity")) {
          const intensity = await getCarbonIntensity(ip);
          request.intensity = !isNaN(intensity) ? intensity : 1;
          // just to be safe if the local ip couldn't be found.
          if(!localIntensity || 2 > localIntensity) {
            localIntensity = intensity;
          }
        }
        requestMap.set(origin, request);
      }
    },
    {urls: ['*://*/*']}
  );

  const getCarbonIntensity = async(ip) => {
      const response = await fetch(`http://localhost:3000/co2/${ip}`).then(function(res) {
        if (!res.ok) {
            throw new Error(`HTTP status ` + res.status + ` ${ip} not found`);
        }
        return res.json();
    });
      return response;
    };
    // calls an external service to get the ip.
    const getLocalIp = async() => {
      const response = fetch("http://api.ipaddress.com/myip?format=json")
      .then(res => res.json())
      .then(data => { return data.ipaddress });
      return response;
    };

  chrome.storage.local.get("storageKey").then(async(result) => {
    const timer = setInterval(writeToStorage, 500);
    // parse if the array exists, else it throws an error.
    // ugly this.
    if (result && result.storageKey && result.storageKey != "[]") {
      requestMap = new Map(JSON.parse(result.storageKey));
    }
    start();
  });

 

    chrome.storage.local.get("localIntensity").then(async(result) => {
      // if our intensity is more than an hour old, we remove it.
      if(result && result.time < Date.now() - 1000*60*60) {
        if (result.intensity) {
          localIntensity = result.intensity;
          return;
        }
      }
      //TODO get local ip from server when it's hosted. Perhaps just get intensity of nearest google server till then.
      // getLocalIPs();
      const localIP = await getLocalIp();
      localIntensity = await getCarbonIntensity(localIP);
      const intensityObj = {intensity: localIntensity, time: Date.now()};
      chrome.storage.local.set({ localIntensity: JSON.stringify(intensityObj) });
    });

    const handleMessage = (request) => {
      if ('reset' === request.action) {
        requestMap = new Map();
        
        chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap])});
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);