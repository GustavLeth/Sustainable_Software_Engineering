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

  const isIpInList = (ip, privateIps) => {
    privateIps.forEach(privateIp => {
      if(privateIp.includes(ip)) {
        return true;
      }
    });
    return false;
  } 
// This works but i'm not touching it.
async function getLocalIPs() {
  var ips = [];

  var RTCPeerConnection = window.RTCPeerConnection ||
      window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

  var pc = new RTCPeerConnection({
      // Don't specify any stun/turn servers, otherwise you will
      // also find your public IP addresses.
      iceServers: []
  });
  // Add a media line, this is needed to activate candidate gathering.
  pc.createDataChannel('');
  
  // onicecandidate is triggered whenever a candidate has been found.
  pc.onicecandidate = async function(e) {
      if (!e.candidate) { // Candidate gathering completed.
          pc.close();
          return;
      }
      var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
      if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
          ips.push(ip);
      const nonLocalHostIps = ips.filter(ipAddress => isIpInList(ipAddress, privateIps));
      // some ip's are private ip's and won't have an address.
      // I'm not sure if we can check which ones are private without trying.
      nonLocalHostIps.forEach(async(ip) => {
        try {
          const intensityResponse = await getCarbonIntensity(ip);
          // get's caught by the try catch if the ip was not found, and then we move on to the next.
          localIntensity = intensityResponse;
          const intensityObj = {intensity: intensityResponse, time: Date.now()};
          chrome.storage.local.set({ localIntensity: JSON.stringify(intensityObj) });
          return;
      } catch(error) {
       console.error(`404 - ${ip} not found`);   
      }
      });
    };
    pc.createOffer(function(sdp) {
      pc.setLocalDescription(sdp);
  }, function onerror() {});
  }

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
    });

    const handleMessage = (request) => {
      if ('reset' === request.action) {
        requestMap = new Map();
        chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap])});
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);