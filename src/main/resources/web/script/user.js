function user() {
    
    var self = this

    var host = ""
    var serviceURL = "/core"
    var authorClientURL = "/eduzen/view/user/123"
    var dmc = new RESTClient(host + serviceURL)

    this.user = undefined
    this.username = undefined
    this.identity = undefined
    this.account = undefined
    this.view = undefined
    this.lectures = undefined

    /** The RESTClient-methods to deal with a user **/

    this.loadUserAccount = function () {
        self.account = dmc.get_topic_related_topics(self.user.id, 
            {"others_topic_type_uri": "dm4.accesscontrol.user_account"})
        self.account = dmc.get_topic_by_id(self.account.items[0].id, true)
        return self.account
    }

    this.loadUserIdentity = function() {
        self.identity = dmc.get_topic_related_topics(self.user.id, 
            {"others_topic_type_uri": "tub.eduzen.identity"})
        self.identity = dmc.get_topic_by_id(self.identity.items[0].id, true)
        return self.identity
    }

    this.loadLecturesParticipating = function () {
        if (user.identity == undefined) return undefined
        var lectures = dmc.get_topic_related_topics(user.identity.id, {"others_topic_type_uri": "tub.eduzen.lecture", 
            "assoc_type_uri": "tub.eduzen.participant"})
        if (lectures.total_count > 0) user.lectures = lectures.items
    }

    this.getCurrentUser = function () {
        self.username = dmc.request("GET", "/accesscontrol/user", undefined, undefined, "text")
        if (self.username != undefined && self.username != "") {
          return self.getLoggedInUser()
        } else {
          return undefined
        }
    }

    this.getLoggedInUser = function () {
        self.user = dmc.request("GET",
          "/core/topic/by_value/dm4.accesscontrol.username/"+ encodeURIComponent(self.username, "UTF-8"), undefined,
          undefined, false)
        return (self.user == undefined) ? undefined : self.loadUserIdentity()
    }

    this.login = function(authorization) {
        if (authorization == undefined) return null
        return dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": authorization})
    }

    this.logout = function() {
        var logout = dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
        window.location.href = host + "/eduzen/view/start"
        return logout
    }

    this.clearHeader = function () {
        $("#header .title").empty()
    }

    this.renderLogin = function (view) {
        self.view = view
        var html = "<br/><p class=\"buffer\"><b class=\"label\">Herzlich Willkommen auf der EducationZEN Online"
            + " &Uuml;bungsplattform zur Unterst&uuml;tzung der Lehre an der TU Berlin</b><br/><br/>"
            + "Authentifizierung ben&ouml;tigt</a><br/></p>"
            + "<form id=\"user-form\" name=\"search\" action=\"javascript:self.loginHandler()\"><p class=\"buffer\">"
            + "  <label for=\"namefield\">Your username</label>"
            + "  <input name=\"namefield\" class=\"pwdfield\" type=\"text\" placeholder=\"Username\"></input><br/>"
            + "  <label for=\"pwdfield\">Your password</label>"
            + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" placeholder=\"Password\"></input><br/><br/>"
            + "  <span class=\"login btn\" title=\"do login\">Login</span><br/><br/></p>"
            + "<p id=\"message\" class=\"buffer failed\"></p><br/>"
            + "<br/><p class=\"buffer\"><b class=\"label\">Weitere Informationen zu unserem Projekt und wie du "
            + "mitmachen kannst erh&auml;ltst du "
            + "auf <a class=\"btn\" href=\"https://www.eduzen.tu-berlin.de\">unserer Projekt-Webseite.</a> "
            + "Hier findest Du auch eine <a class=\"btn\" href=\"https://www.eduzen.tu-berlin.de/webanwendung\">"
            + "kurze Einf&uuml;hrung in die &Uuml;bungsplattform</a>.<br/></b></p></form><br/>"
        $(".title").html(html)
        $(".login.btn").click(self.loginHandler)
        $("[name=pwdfield]").keypress(function (e) {
            if (e.keyCode == 13) {
                self.loginHandler()
                return function(){}
            }
        })
    }

    this.loginHandler = function(e) {
        var username = $("[name=namefield]").val()
        var password = $("[name=pwdfield]").val()
        try {
            // self.login(authorization()) // throws 401 if login fails
            var authorization = authorization()
            if (authorization == undefined) return null
            // throws 401 if login fails
            dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": authorization})
            show_message("Login OK", "ok")
            console.log("login OK")
        } catch (e) {
            show_message("Nutzername oder Passwort ist falsch.", "failed")
            console.log("Access denied.")
        }
        
        if (user.getCurrentUser()) {
            self.clearHeader()
            self.view.initViews()
        }

        /** Returns value for the "Authorization" header. */
        function authorization() {
            return "Basic " + btoa(username + ":" + password)   // ### FIXME: btoa() might not work in IE
        }

        function show_message(message, css_class, callback) {
            $("#message").fadeOut(200, function() {
              $(this).text(message).removeClass().addClass(css_class).fadeIn(600, callback)
            })
        }

    }
}
