/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var dmc = new RESTClient("http://localhost:8080/core")
var dict = new eduzenDictionary("DE")

var eView = new function () {

  this.historyApiSupported = window.history.pushState

  this.results = undefined
  this.user = undefined

  /** excercise View application controler **/

  this.initSearchView = function () { 
    eView.user = eView.getCurrentUser()
    eView.renderUser()
    // registering handler
    $("[name=search]").submit(eView.doSearch)
    window.addEventListener("popstate", function(e) {
      if (e.state) eView.popHistory(e.state)
    })
    // handling deep links
    var entryUrl = window.location.href
    var commandingUrl = entryUrl.substr(entryUrl.indexOf("#") + 1)
    var commands = commandingUrl.split("?")

    /** if (commands[0] === "dosearch") {
      var value = commands[1].substr(commands[1].indexOf("=") + 1)
      $("[name=searchfield]").val("" + value + "")
      eView.doSearch(value)
    } else if (commands[0] === "doshow") {
      var exId = parseInt(commands[1].substr(commands[1].indexOf("=") + 1))
      eView.showResultDetails(undefined, exId)
    } **/
  }

  this.renderUser = function () {
    $(".title").html("Hi <a href=\"/eduzen/view/user/" + eView.user.id + "\" class=\"username\"> "
      + eView.user.value + "</a>! <span class=\"logout\" onclick=\"eView.logout()\">log out</span>")
  }

  /** Controler for the search functionality **/

  this.doSearch = function (searchFor) {
    
    // eView.pushHistory({"action": "dosearch", "parameter": resultObject}, "#dosearch?for=" + searchValue)
  }

  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!eView.historyApiSupported) return
    if (state.action == "dosearch") {
      var searchValue = state.parameter.searchFor
      $("[name=searchfield]").val("" + searchValue + "")
      eView.doSearch(searchValue)
    } else if (state.action == "doshow") {
      var exId = state.parameter
      eView.showResultDetails(undefined, exId)
    }
  }

  this.pushHistory = function (state, link) {
    if (!eView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  /** Methods to access eduzen and accesscontrol REST-Services **/

  this.get_excercises_by_topicalarea = function(id) {
    return dmc.request("GET", "/eduzen/excercise/by_topicalarea/" + id, undefined, undefined, undefined, false)
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.login = function(authorization) {

    var DEFAULT_USER = "admin"
    var DEFAULT_PASSWORD = ""
    var ENCRYPTED_PASSWORD_PREFIX = "-SHA256-" // don't change this
    var pwd = ENCRYPTED_PASSWORD_PREFIX + SHA256(DEFAULT_PASSWORD)
    var credentials = "admin:" + pwd

    return dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": "Basic "+ btoa(credentials)})
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(eView.initSearchView)
