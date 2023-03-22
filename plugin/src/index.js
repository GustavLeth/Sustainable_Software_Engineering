let localIntensity = 0;
let requestMap = new Map();
let resetButton;
let readMoreButton;
const downloadConstant = 1;
const uploadConstant = 2;
const storageKey = "energy_usage_map";

// keys: ip and size.
const resetByteTracker = () => {
  console.log("reset");
  totalBytes = 0;
  
  chrome.storage.sync.set({ storageKey: JSON.stringify(new Map()) }).then(() => {
    console.log(`Set ${storageKey}: ` + JSON.stringify(new Map()));
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

  const calculateCo2Usage = () => {
    if (requestMap.size < 1) {
      return 0;
    }
    const mapIterator = requestMap.values();
    let Co2Consumed = 0;
    while(true) {
      const next = mapIterator.next().value;
      if (!next) {
        break;
      }
      //TODO convert this to actual kwh, @Elias
      Co2Consumed += (next.intensity * next.size * uploadConstant) + (next.size * localIntensity * downloadConstant)
    }
    return Co2Consumed
  }

  const writeToStorage = () => {
      chrome.storage.sync.set({ storageKey: JSON.stringify([...requestMap]) });
      try {
        //   const bytesElement = document.getElementById("bytes_used");
        // bytesElement.textContent = totalBytes / 1024;
        const Co2Consumed = calculateCo2Usage();
        const carbonUsedElement = document.getElementById("carbon_equivalent");
        if (carbonUsedElement) {
          setBeerEquivalent(Co2Consumed);
          carbonUsedElement.textContent = Co2Consumed;
        }
        // TODO move these somewhere else, not sure how i hook into the lifecycle of the app at the right spot.
        if (!resetButton) {
          resetButton = document.getElementById("reset_button")
          resetButton.onclick = () => resetByteTracker();
        }
        if (!readMoreButton) {
          readMoreButton = document.getElementById("read_more_button")
          readMoreButton.onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('readmore.html') });
        }
      } catch (error) {
        console.error("document not defined", error);
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
        return;
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

  // extracts the ip and the intensity and puts it in the map-
  chrome.webRequest.onResponseStarted.addListener(
    async({ip, ...req}) => {
      const origin = extractHostname(!req.initiator ? req.url : req.initiator);
      const request = requestMap.get(origin);
      if (request) {
        // add ip address to our request.
        request.ip = ip;
        if (!request.hasOwnProperty("intensity")) {
          request.intensity = await getCarbonIntensity(ip);
        }
        requestMap.set(origin, request);
      }
    },
    {urls: ['*://*/*']}
  );

  const getCarbonIntensity = async(ip) => {
    try {
    const response = await fetch(`http://localhost:3000/co2/${ip}`);
    const intensity = await response.json();
    return intensity;
    } catch(error) {
      console.error("couldn't fetch from backend");
      return 0;
    }
  }
  
 const setBeerEquivalent = async(carbonConsumed) => {
    try {
    const beerElement = document.getElementById("beer_equivalent");
    beerElement.textContent = carbonConsumed/250.0; //https://www.co2everything.com/co2e-of/beer
    } catch(error) {
      console.error("couldn't fetch from backend");
      return 0;
    }
  }

  const setLocalCarbonIntensity = (intensity) => {
    const carbonIntensityElement = document.getElementById("carbon_intensity");
    carbonIntensityElement.textContent = intensity;
  }

function getLocalIPs() {
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
  pc.onicecandidate = function(e) {
      if (!e.candidate) { // Candidate gathering completed.
          pc.close();
          // callback(ips);
          return;
      }
      var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
      if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
          ips.push(ip);
  };
  return ips;
}
let timer;
  chrome.storage.sync.get([storageKey]).then((result) => {
    // parse if the array exists, else it throws an error.
    if (result.storageKey && result.storageKey != "[]") {
      requestMap = new Map(JSON.parse(result.storageKey));
    }
    //find local ip, and set intensity
    if (!localIntensity) {
    const localIps = getLocalIPs();
    const ip = localIps.find(localIp => localIp != "192.168.0.101");
      if (ip) {
      localIntensity = getCarbonIntensity(ip);
      setLocalCarbonIntensity(localIntensity);
      }
    }
    timer = setInterval(writeToStorage, 1000);
    start();
    // Not sure if this does anything - but if it does it removes the instance of the app when you switch to another tab, and the other tab then starts it's own instance.
    // The two instances use the same data storage, so data shouldn't be lost (maybe a little bit since we only write once a second.) 
    chrome.runtime.onSuspend.addListener(clearInterval(timer));
  });
