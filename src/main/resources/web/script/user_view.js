/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")
var user = new user()

var uView = new function () {

  this.historyApiSupported = window.history.pushState

  /** excercise View application controler **/

  this.initView = function () {
    if (user.getCurrentUser() === undefined) {
      user.renderLogin(uView)
    } else {
      uView.renderUsername()
      user.loadUserAccount()
      uView.renderUserAccount()
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
    var html = "<br/><p class=\"buffer\"><a class=\"btn back\" href=\"javascript:history.back()\">Zur&uuml;ck</a><br/>"
        + "<br/>Kontoeinstellungen von <span class=\"label\">" + user.user.value + "</span></a>"
        + "<br/><br/><span class=\"logout button\">Logout</span><p><br/></p>"
        + "<form id=\"user-form\" name=\"search\" action=\"javascript:void(0)\"><p class=\"buffer\">"
        + "  <label for=\"pwdfield\">Your encrypted password</label><span class=\"edit button\">Edit</span>"
        + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" disabled=\"disabled\""
        + "    placeholder=\"Password\"></input><br/><br/>"
        + "  <span class=\"pwdsave button\">Save</span></p>"
        + "</form>"
    $(".title").html(html)
    $(".edit.button").click(uView.pwdHandler)
    $(".logout.button").click(user.logout)
    // $(".mailedit.button").click(uView.mailHandler)
    $(".pwdsave.button").hide()
  }

  this.renderUserAccount = function() {
    var password = user.account.composite['dm4.accesscontrol.password'].value
    $(".pwdfield").val(password)
    $(".pwdsave.button").click(uView.submitPassword)
    var html = "<p class=\"buffer\">"
        + "  <label for=\"mailfield\">Your current mailbox</label><span class=\"mailedit button\">Edit</span>"
        + "  <input name=\"mailfield\" class=\"mailfield\" type=\"text\" disabled=\"disabled\""
        + "    placeholder=\"E-Mail\"></input><br/>"
        + "  <span class=\"emailsave button\">Save</span></p>"
    $("#user-form").append(html)
    $(".emailsave.button").hide()
    // ### display console.log(user.account)
  }

  this.pwdHandler = function (e) {
      if ($(".2nd.pwdfield")[0] == undefined) {
        $(".pwdfield").removeAttr("disabled")
        $("[for=pwdfield]").html("Enter your new password")
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
    var password = user.account.composite['dm4.accesscontrol.password'].value
    var controlField = "<label for=\"2ndpwdfield\">Please retype your new password here</label>"
      + "<input name=\"2ndpwdfield\" class=\"2nd pwdfield\" type=\"password\" "
      + "placeholder=\"Password\" value=\"" + password + "\"></input>"
    $(controlField).insertBefore(".pwdsave.button")
  }

  this.submitPassword = function (e) {
    var next = $(".pwdfield").val()
    var and = $(".2nd.pwdfield").val()
    var pwd = undefined
    if (next === and) {
      pwd = "-SHA256-" + SHA256(next)
      var password = user.account.composite['dm4.accesscontrol.password']
      user.account.composite['dm4.accesscontrol.password'].value = pwd
      dmc.update_topic(user.account.composite['dm4.accesscontrol.password'])
    } else {
      console.log("password update not saved, 2 passwords did not match")
    }
    // update gui
    uView.initView()
  }

}

$(window).load(uView.initView)
