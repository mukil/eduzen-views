function user() {
    
    var self = this

    var host = "http://localhost:8080"
    var serviceURL = "/core"
    var authorClientURL = "/eduzen/view/user/123"
    var dmc = new RESTClient(host + serviceURL)

    this.user = undefined
    this.identity = undefined
    this.account = undefined
    this.view = undefined

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
        // fixme
        return dmc.get_topic_related_topics(user.account.id, {"others_topic_type_uri": "tub.eduzen.lecture", 
            "assoc_type_uri": "tub.eduzen.participant"})
    }

    this.getCurrentUser = function () {
        self.user = dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
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

    this.renderLogin = function (view) {
        self.view = view
        var html = "Authentifizierung ben&ouml;tigt</a><br/><br/>"
          html += "<form id=\"user-form\" name=\"search\" action=\"javascript:self.loginHandler()\">"
            + "  <label for=\"namefield\">Your username</label>"
            + "  <input name=\"namefield\" class=\"pwdfield\" type=\"text\" placeholder=\"Username\"></input><br/>"
            + "  <label for=\"pwdfield\">Your password</label>"
            + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" placeholder=\"Password\"></input><br/><br/>"
            + "  <span class=\"login btn\" title=\"do login\">Login</span><br/><br/>"
            + "</form>"
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
        self.login(authorization())
        self.view.initViews()
      
        /** Returns value for the "Authorization" header. */
        function authorization() {
            return "Basic " + btoa(username + ":" + password)   // ### FIXME: btoa() might not work in IE
        }
    }

}
