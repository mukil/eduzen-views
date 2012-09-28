/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var dmc = new RESTClient("http://localhost:8080/core")
var dict = new eduzenDictionary("DE")

var uView = new function () {

  this.historyApiSupported = window.history.pushState

  this.user = undefined
  this.userAccount = undefined

  /** excercise View application controler **/

  this.initView = function () { 
    uView.user = uView.getCurrentUser()
    if (uView.user != undefined) {
      uView.renderUsername()
      uView.loadUserAccount()
      uView.renderUserAccount()
    } else {
      uView.renderLogin()
    }
    // registering handler
    /** $("[name=search]").submit(uView.doSearch)
    window.addEventListener("popstate", function(e) {
      if (e.state) uView.pop_history(e.state)
    }) **/
    // handling deep links
    var entryUrl = window.location.href
    var commandingUrl = entryUrl.substr(entryUrl.indexOf("#") + 1)
    var commands = commandingUrl.split("?")

    if (commands[0] === "userId") {
      var value = commands[1].substr(commands[1].indexOf("=") + 1)
      console.log("render User " + value)
    } /** else if (commands[0] === "doshow") {
      var exId = parseInt(commands[1].substr(commands[1].indexOf("=") + 1))
      uView.showResultDetails(undefined, exId)
    } **/
  }

  this.renderUsername = function () {
    var html = "Kontoeinstellungen von <span class=\"account\">" + uView.user.value + "</span></a>"
      html += "<p><br/></p>"
      html += "<form id=\"user-form\" name=\"search\" action=\"javascript:void(0)\">"
        + "  <label for=\"pwdfield\">Your encrypted password</label><span class=\"edit button\">Edit</span>"
        + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" disabled=\"disabled\""
        + "    placeholder=\"Password\"></input><br/><br/>"
        + "  <span class=\"pwdsave button\">Save</span>"
        + "</form>"
    $(".title").html(html)
    $(".edit.button").click(uView.pwdHandler)
    // $(".mailedit.button").click(uView.mailHandler)
    $(".pwdsave.button").hide()
  }

  this.renderLogin = function () {
    var html = "Authentifizierung ben&ouml;tigt <span class=\"authenticate\">Login</span></a>"
      html += "<p><br/></p>"
      html += "<form id=\"user-form\" name=\"search\" action=\"javascript:uView.loginHandler()\">"
        + "  <label for=\"namefield\">Your username</label>"
        + "  <input name=\"namefield\" class=\"pwdfield\" type=\"text\" placeholder=\"Username\"></input><br/>"
        + "  <label for=\"pwdfield\">Your password</label>"
        + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" placeholder=\"Password\"></input><br/><br/>"
        + "  <span class=\"login button\"><a href=\"#login\" title=\"do login\">Login</a></span>"
        + "</form>"
    $(".title").html(html)
    $(".login.button").click(uView.loginHandler)
  }

  this.renderUserAccount = function() {
    var password = uView.userAccount.composite['dm4.accesscontrol.password'].value
    $(".pwdfield").val(password)
    $(".pwdsave.button").click(uView.submitPassword)
    var html = "<p><br/></p>"
        + "  <label for=\"mailfield\">Your current mailbox</label><span class=\"mailedit button\">Edit</span>"
        + "  <input name=\"mailfield\" class=\"mailfield\" type=\"text\" disabled=\"disabled\""
        + "    placeholder=\"E-Mail\"></input><br/>"
        + "  <span class=\"emailsave button\">Save</span>"
    $("#user-form").append(html)
    $(".emailsave.button").hide()
    console.log(uView.userAccount)
  }

  this.pwdHandler = function (e) {
      if ($(".2nd.pwdfield")[0] == undefined) {
        $(".pwdfield").removeAttr("disabled")
        $(".pwdsave.button").show()
        uView.renderAndPasswordField()
      } else {
        $(".pwdfield").attr("disabled", "disabled")
        $(".2nd.pwdfield").remove()
        $("[for=2ndpwdfield]").remove()
        $(".pwdsave.button").hide()
      }
      return void(0)
  }

  this.renderAndPasswordField = function () {
    var password = uView.userAccount.composite['dm4.accesscontrol.password'].value
    var controlField = "<label for=\"2ndpwdfield\">Please retype your new password here</label>"
      + "<input name=\"2ndpwdfield\" class=\"2nd pwdfield\" type=\"password\" "
      + "placeholder=\"Password\" value=\"" + password + "\"></input>"
    $(controlField).insertBefore(".pwdsave.button")
  }

  this.submitPassword = function (e) {
    var next = $(".pwdfield").val()
    var and = $(".2nd.pwdfield").val()
    var pwd = undefined
    if (next == and) {
      pwd = "-SHA256-" + SHA256(next)
    }
    var password = uView.userAccount.composite['dm4.accesscontrol.password']
    uView.userAccount.composite['dm4.accesscontrol.password'].value = pwd
    dmc.update_topic(uView.userAccount.composite['dm4.accesscontrol.password'])
  }

  /** HTML History API methods **/

  this.popHistory = function (state) {
    if (!uView.historyApiSupported) return
    if (state.action == "doshow") {
      var param = state.parameter
    }
  }

  this.pushHistory = function (state, link) {
    if (!uView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  /** The uViews RESTClient-methods **/

  this.loadUserAccount = function () {
    uView.userAccount = dmc.get_topic_related_topics(uView.user.id, 
      {"others_topic_type_uri": "dm4.accesscontrol.user_account"}
    )
    uView.userAccount = dmc.get_topic_by_id(uView.userAccount.items[0].id)
  }

  this.getCurrentUser = function () {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.loginHandler = function(e) {
    var username = $("[name=namefield]").val()
    var password = $("[name=pwdfield]").val()
    console.log("login debug")
    console.log(username)
    console.log(password)
    var authorization = { 'username': username, 'password': password }
    uView.login(authorization)
  }

  this.login = function(authorization) {
    if (authorization == undefined) return null
    var ENCRYPTED_PASSWORD_PREFIX = "-SHA256-" // don't change this
    var pwd = ENCRYPTED_PASSWORD_PREFIX + SHA256(authorization.password)
    var credentials = authorization.username + ":" + pwd
    console.log("logging in with " + credentials)
    return dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": "Basic "+ btoa(credentials)})
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(uView.initView)
