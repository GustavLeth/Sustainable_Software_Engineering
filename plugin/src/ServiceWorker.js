let requestMap = new Map();
const backendUrl = "http://142.93.161.61:3000";
let latestOrigin = "";
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
      chrome.storage.local.set({ latestOrigin: latestOrigin});
    };
  
  const onHeadersReceivedListener = (requestDetails) => {
    const {initiator, url, responseHeaders} = requestDetails;
    const origin = extractHostname(initiator ?? url);
    const responseHeadersContentLength = responseHeaders.find(header => header.name.toLowerCase() === "content-length");
    latestOrigin = origin;
    const contentLength = responseHeadersContentLength ?? {value: 0};
    if (contentLength.value > 0) {
      const request = requestMap.get(origin) ?? {}
      const size = parseInt(contentLength.value, 10) + (request?.size ?? 0);
      requestMap.set(origin, {...request, size: size, origin});
    }
  };
  
  // extracts the ip and the intensity and puts it in the map-
  const onResponseStartedListener = async(response) => {
    const {ip, initiator, url, statusCode} = response;
    //TODO this might need some more things, but I think it doesn't loop requests from the backend anymore.
    // But if it does, this is the place.
    if(ip == "::1" || ip == "142.93.161.61" || statusCode > 299) {
      return;
    }
    const origin = extractHostname(initiator ?? url);
      const request = requestMap.get(origin);
      // Check if intensity time is too old.
      if (request && (!request?.intensityTime || request.intensityTime < Date.now() - 1000*60*60)) {
          try {
            request.ip = ip;
            const intensityResponse = await getCarbonIntensity(ip);
            const intensity = !isNaN(intensityResponse) ? intensityResponse : 1;
            //refetch and spread on the request, just in case anything changed in between.
            requestMap.set(origin, {...requestMap.get(origin), intensity: intensity, intensityTime: Date.now()});
          } catch (error) {
            console.log(error);
          }
    }
  }

  const getCarbonIntensity = async(ip) => {
      const response = await fetch(`${backendUrl}/co2/${ip}`).then(function(res) {
        if (!res.ok) {
            throw new Error(`HTTP status ` + res.status + ` ${ip} not found`);
        }
        return res.json();
    });
      return response;
    };

    const handleMessage = (request) => {
      if ('reset' === request.action) {
        requestMap = new Map();
        chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap])});
      }
    }
  
    const start = async() => {
      chrome.webRequest.onHeadersReceived.addListener(
        onHeadersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
      chrome.webRequest.onResponseStarted.addListener(
        onResponseStartedListener,
        {urls: ['*://*/*']}
      );
      // the reset command from the page.
      chrome.runtime.onMessage.addListener(handleMessage);
      // get's the map of origins
      chrome.storage.local.get("storageKey").then(async(result) => {
        setInterval(writeToStorage, 500);
        if (result?.storageKey && result.storageKey != "[]") {
          requestMap = new Map(JSON.parse(result.storageKey));
        }
      });
  };

start();
    