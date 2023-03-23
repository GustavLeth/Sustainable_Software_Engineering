let localIntensity;
let requestMap = new Map();
let resetButton;
let readMoreButton;
const uploadConstant = 0.81/1024**3; // [kWh/byte] Use same conversion factor as websitecarbon.com.
const downloadConstant = 0.81/1024**3; // [kWh/byte] Same for now!
const storageKey = "energy_usage_map";
const includeLogs = true;
includeLogs && console.log("top log");
// keys: ip and size.
const resetByteTracker = () => {
  console.log("reset");
  requestMap = new Map();
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
      console.log('next.intensity * next.size * uploadConstant) + (next.size * localIntensity * downloadConstant', next.intensity, next.size, uploadConstant, next.size, localIntensity, downloadConstant)
      Co2Consumed += ((next.intensity ?? 1) * next.size * uploadConstant) + ((localIntensity ?? 1) * next.size * downloadConstant); // [gCO2equiv]
    }
    console.log('Co2Consumed', Co2Consumed);

    return isNaN(Co2Consumed) ? 0 : Co2Consumed;
  }

  const writeToStorage = () => {
      // console.log("write to storage");
      chrome.storage.sync.set({ storageKey: JSON.stringify([...requestMap]) });
      try {
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
          const currentSize = requestMap.has(origin) ? requestMap.get(origin).size : 0;
          const requestSize = parseInt(contentLength.value, 10) + currentSize;
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
        if (!Object.keys(request).includes("intensity")) {
          const intensity = await getCarbonIntensity(ip);
          request.intensity = !isNaN(intensity) ? intensity : 1;
        }
        requestMap.set(origin, request);
        const Co2Consumed = calculateCo2Usage();
        const carbonUsedElement = document.getElementById("carbon_equivalent");
        if (carbonUsedElement) {
          setBeerEquivalent(Co2Consumed);
          carbonUsedElement.textContent = Co2Consumed;
        }
      }
    },
    {urls: ['*://*/*']}
  );

  const getCarbonIntensity = async(ip) => {
    try {
      console.log('getCarbonIntensity ip', ip);
      const response = await fetch(`http://localhost:3000/co2/${ip}`);
      const intensity = await response.json();
      return intensity;
    } catch(error) {
      console.error("couldn't fetch from backend");
    }
    return "No response returned";
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
// This works but i'm not touching it.
async function getLocalIPs() {
  console.log("in get local ips");
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
          console.log("no candiate");
          return;
      }
      console.log("her1 ");
    console.log('her2');
      var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
      if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
          ips.push(ip);
      const nonLocalHostIps = ips.filter(localIp => localIp != "192.168.0.101");

      nonLocalHostIps.forEach(async(ip) => {
        const intensityResponse = await getCarbonIntensity(ip);
        if(!isNaN(intensityResponse)) {
          localIntensity = intensityResponse;
          setLocalCarbonIntensity(localIntensity);
          return;
        }
      });
      // setTimeout(async() => {
      //   return await getLocalIPs();
      //   }, 1000);
      // return;
    };
    pc.createOffer(function(sdp) {
      pc.setLocalDescription(sdp);
  }, function onerror() {});
  }

  chrome.storage.sync.get([storageKey]).then(async(result) => {
    includeLogs && console.log("got from log");
    const timer = setInterval(writeToStorage, 10000);
    // parse if the array exists, else it throws an error.
    if (result.storageKey && result.storageKey != "[]") {
      requestMap = new Map(JSON.parse(result.storageKey));
    }
    //finds the local IP and sets the local intensity.
    console.log("!localintensity", localIntensity);
    if (!localIntensity) {
      console.log("getting local ips");
      getLocalIPs();
    }
    includeLogs && console.log("writing to storage");
    start();
    // Not sure if this does anything - but if it does it removes the instance of the app when you switch to another tab, and the other tab then starts it's own instance.
    // The two instances use the same data storage, so data shouldn't be lost (maybe a little bit since we only write once a second.) 
    // chrome.runtime.onSuspend.addListener(clearInterval(timer));
  });
