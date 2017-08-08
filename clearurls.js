/*
 * ##################################################################
 * # Fetch Rules & Exception from URL                               #
 * ##################################################################
 */
var data = [];
var providers = [];
var prvKeys = [];
var globalStatus;

/**
 * Initialize the JSON provider object keys.
 *
 * @param {JSON Object} obj
 */
function getKeys(obj){
   for(var key in obj){
      prvKeys.push(key);
   }
};

/**
 * Initialize the providers form the JSON object.
 * 
 */
function createProviders()
{
    for(var p = 0; p < prvKeys.length; p++)
    {
        //Create new provider
        providers.push(new Provider(prvKeys[p],data.providers[prvKeys[p]].completeProvider));

        //Add URL Pattern
        providers[p].setURLPattern(data.providers[prvKeys[p]].urlPattern);

        //Add rules to provider
        for(var r = 0; r < data.providers[prvKeys[p]].rules.length; r++)
        {
            providers[p].addRule(data.providers[prvKeys[p]].rules[r]);
        }

        //Add exceptions to provider
        for(var e = 0; e < data.providers[prvKeys[p]].exceptions.length; e++)
        {
            providers[p].addException(data.providers[prvKeys[p]].exceptions[e]);
        }
    }
};

/**
 * Fetch the Rules & Exception github.
 * 
 */
function fetchFromURL()
{

    fetch("https://raw.githubusercontent.com/KevinRoebert/ClearUrls/master/data/data.json")
    .then((response) => response.text().then(toJSON));

    function toJSON(retrievedText) { 
        data = JSON.parse(retrievedText);
        getKeys(data.providers);
        createProviders();
    }
}
//Execute the command
fetchFromURL();
// ##################################################################

/*
 * ##################################################################
 * # Supertyp Provider                                              #
 * ##################################################################
 */
/**
 * Declare constructor
 *
 * @param {String} _name                Provider name
 * @param {boolean} completeProvider    Set URL Pattern as rule
 */
function Provider(_name,_completeProvider = false){
    var name = _name;
    var urlPattern;
    var rules = new Array();
    var exceptions = new Array();
    var canceling = _completeProvider;

    if(_completeProvider){
        rules.push(".*");
    }

    /**
     * Add URL pattern.
     * 
     * @require urlPatterns as RegExp
     */
    this.setURLPattern = function(urlPatterns) {
        urlPattern = new RegExp(urlPatterns, "mgi");
    };

    /**
     * Return if the Provider Request is canceled
     * @return {Boolean} isCanceled
     */
    this.isCaneling = function() {
        return canceling;
    };

    /**
     * Check the url is matching the ProviderURL.
     * 
     * @return {String}    ProviderURL as RegExp
     */    
    this.matchURL = function(url) {  
        return !(matchException(url)) && (url.match(urlPattern) != null) && (url.match(urlPattern).length > 0);
    };

    /**
     * Add a rule to the rule array.
     * 
     * @param String rule   RegExp as string
     */
    this.addRule = function(rule) {
        rules.push(rule);
    };

    this.setRules = function(_rules) {
        rules = _rules;
    };

    /**
     * Return all rules as an array.
     * 
     * @return Array RegExp strings
     */
    this.getRules = function() {
        return rules;
    };

    /**
     * Add a exception to the exceptions array.
     * 
     * @param String exception   RegExp as string
     */
    this.addException = function(exception) {
        exceptions.push(exception);
    };

    /**
     * Private helper method to check if the url
     * an exception.
     * 
     * @param  {String} url     RegExp as string
     * @return {boolean}        if matching? true: false
     */
    matchException = function(url) {
        var result = false;

        for (var i = 0; i < exceptions.length; i++) {
            if(result) { break; }
            
            result = (url.match(new RegExp(exceptions[i], "gmi")) != null) && (url.match(new RegExp(exceptions[i], "gmi")).length > 0);          
        }

        return result;
    };
}
// ##################################################################

/**
 * Helper function which remove the tracking fields
 * for each provider given as parameter.
 * 
 * @param  {Provider} provider      Provider-Object
 * @param  {webRequest} request     webRequest-Object
 * @return {Array}                  Array with changes and url fields
 */
function removeFieldsFormURL(provider, request)
{
    var url = request.url;
    var rules = provider.getRules();
    var changes = false;
    var cancel = false;

    if(provider.matchURL(url))
    {
        for (var i = 0; i < rules.length; i++) {
            var bevorReplace = url;
            
            url = url.replace(new RegExp(rules[i], "gi"), "");

            if(bevorReplace != url)
            {
                changes = true;
            }
        }

        if(provider.isCaneling()){
            cancel = true;
        }
    }

    return {
        "changes": changes,
        "url": url,
        "cancel": cancel
    }
};

/**
 * Function which called from the webRequest to
 * remove the tracking fields from the url.
 * 
 * @param  {webRequest} request     webRequest-Object
 * @return {Array}                  redirectUrl or none
 */
function clearUrl(request)
{
    browser.storage.local.get('globalStatus', clear);

    function clear(data){
        globalStatus = data.globalStatus;

        if(globalStatus == null){
            globalStatus = true;
        }
    }

    if(globalStatus){

            var result = {
            "changes": false,
            "url": ""
            };
            
            /*
             * Call for every provider the removeFieldsFormURL method.
             */
            for (var i = 0; i < providers.length; i++) {
                result = removeFieldsFormURL(providers[i], request);

                /*
                 * Cancel the Request
                 */
                if(result["cancel"]){
                    return {
                        cancel: true
                    }
                }

                /*
                 * Ensure that the function go not into
                 * an loop.
                 */
                if(result["changes"]){
                    return {
                        redirectUrl: result["url"]
                    };
                }         
            }
            }     
};

/**
 * Call by each Request and checking the url.
 * 
 * @type {Array}
 */
browser.webRequest.onBeforeRequest.addListener(
  clearUrl,
  {urls: ["<all_urls>"]},
  ["blocking"]
);