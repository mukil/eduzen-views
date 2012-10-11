/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")
var user = new user()

var aView = new function () {

  this.historyApiSupported = window.history.pushState
  this.ui = undefined

  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLectureId = undefined // FIXME: move to uView, support many
  this.currentExcercise = undefined
  this.currentExcerciseObject = undefined
  this.sampleExcerciseText = undefined
  this.sampleApproach = undefined
  // an excercise can haz many approaches, so this is only set if _one_ approach is in detail-view
  this.currentApproach = undefined
  this.currentFileApproach = undefined
  // personal work history for this excercise-text
  this.allExcercises = new Array()
  this.existingComments = new Array()
  // personal state of an excercise-text can be
  // "tub.eduzen.approach_undecided" | "tub.eduzen.approach_correct" | "tub.eduzen.approach_wrong" | "new"
  this.eTextState = {"uri": "new"}


  /** Main Approach View initialization controler **/

  this.initViews = function () {
    // This view routes on "lecture/*/topicalarea/*/etext/*" and "/submissions"
    // consider: is topicalarea, and lecture really necessary here?

    aView.ui = new GUIToolkit() // used to create new upload-dialog

    var entryUrl = window.location.href
    // handling routes
    commands = entryUrl.substr(entryUrl.indexOf("view/") + 5).split("/")
    console.log("entry point => " + commands)
    aView.currentLectureId = commands[1]
    var entity = commands[2]
    var topicalareaId = commands[3]
    var excerciseTextId = undefined
    var excerciseId = undefined
    if (entity === "topicalarea") {
      console.log("load topicalarea-view for => " + topicalareaId)
      if (commands[4] === "etext") {
        excerciseTextId = commands[5]
        console.log("  load excercise-text-view for => " + excerciseTextId)
        if (commands[6] === "excercise") {
          excerciseId = commands[7]
          console.log("  load excercise-view for => " + excerciseId)
        }
      }
      if (!aView.currentLectureId) throw new Error("No current Lecture was set. Try to log out and log in again.")
      // initializing client side model for topicalarea, excercise-text and possibly an excercise
      aView.initApproachView(topicalareaId, excerciseTextId, excerciseId)
    } else if (commands[0] === "submissions") {
      console.log("why not load all submitted approachs and comments to it..")
      aView.initSubmissionsView()
    }
  }

  this.initApproachView = function (topicalareaId, excerciseTextId, excerciseId) {
    if (topicalareaId != undefined) {
      aView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
      // ### FIXME: check access if topicalarea is really part of this lecture
      // ### render general infos for topicalarea
      if (excerciseTextId != undefined) {
        // ### FIXME: check access if excercise text is really part of this topicalare in this lecture
        aView.currentExcerciseText = dmc.get_topic_by_id(excerciseTextId, true)
        if (excerciseId != undefined) {
          aView.currentExcercise = dmc.get_topic_by_id(excerciseId, true)
          // TODO: handle: if user has already taken this excercise-text but not submitted an approach yet.
          console.log(" linking into excercise approach overview, fetch approach-history")
          aView.renderHeader("excercise")
          aView.renderExcerciseApproachInfo()
        } else {
          console.log(" linking into excercise-text overview, fetch excercise-history")
          aView.renderHeader("excercise-text")
          // 
          aView.loadExcercisesForExcerciseText(excerciseTextId)
          if (aView.isSampleApproachAvailable(excerciseTextId)) { 
            aView.renderSampleSolutionForExcerciseText()
          }
          // render excercise-text with all taken excercises
          aView.renderExcerciseText() // with excercise-history, if present
        }
      } else {
        // ### or all other excercises from within our current topicalarea
        // aView.renderAllExcercises()
      }
    } else {
      // no topicalarea set, no excercise_text requested.. get all open topical areas
      // eView.currentTopicalareas = aView.loadTopicalAreasByXYZ(aView.user.id).items
      // eView.renderTopicalareas()
      // ### eView.currentTopicalareas = aView.loadTopicalAreasByUserId(aView.user.id).items
      /** if (aView.currentTopicalareas != undefined) {
        aView.renderTopicalareas()
      } **/
      // and render all excercises ever (?) for our current user
    }
  }

  this.initSubmissionsView = function () {
    if (aView.allExcercises) {
      aView.renderAllExcercisesList()
    }
  }



  /** Rendering Methods - Strictly Control Flow, Model Handling and View Updates **/

  this.renderHeader = function (page) {
    $(".eduzen").addClass("approach-view")
    $("#bottom").hide() // hide notification bar
    if (user.getCurrentUser() == undefined) {
      user.renderLogin(aView)
    } else {
      aView.renderUser()
      aView.renderPageTitle(page)
    }
  }

  this.renderUser = function () {
    $(".title").html("Hi <a href=\"/eduzen/view/user/" + user.user.id + "\" class=\"btn username\"> "
      + user.user.value + "</a>.&nbsp;")
  }

  this.renderPageTitle = function (page) {
    if (page === "excercise-text") {
      var excerciseTextName = aView.currentExcerciseText.value
      var tpName = aView.currentTopicalarea.value
      $(".title").append("Du kannst so viele &Uuml;bungen einreichen wie du m&ouml;chtest, sobald eine im "
        + "1. Versuch korrekt ist, ist die Aufgabenstellung gel&ouml;st.<br/>"
        + "<b class=\"label\">Du schaust gerade auf die Aufgabenstellung <span class=\"excercise-text selected\">"
        + excerciseTextName +"</span> im Themenkomplex</b> "
        + "<a href=\"/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/"
        + aView.currentTopicalarea.id + "\" class=\"topicalareaname\" title=\"Themenkomplex: "
        + tpName + "\" alt=\"" + tpName + "\">" + tpName + "</a><br/>")
    } else if (page === "excercise") {
      var excerciseState = aView.getExerciseState(aView.currentExcercise.id)
      $(".title").append("<b class=\"label\">Der aktuelle Themenkomplex ist"
        + "<a class=\"topicalareaname\" href=\""+ aView.getTopicalareaUrl() +"\">"+ aView.currentTopicalarea.value +"</a><br/>"
        + "Die Aufgabenstellung <a class=\"btn e-text\" href=\""+ aView.getExcerciseTextUrl() +"\">"+ aView.currentExcerciseText.value +"</a>"
        + " ist <span class=\"darkstate\">\"" + dict.stateName(excerciseState.quest_state) + "\"</span>"
        + ", die &Uuml;bung hat den Status <span class=\"darkstate\">\"" + dict.stateName(excerciseState.excercise_state) + "\"</span>.</b><br/>")
      .append("<b class=\"label\">Hier siehst du all deine L&ouml;sungsversuche f&uuml;r diese &Uuml;bung</b>")
    }
  }

  this.renderExcerciseText = function () {
    // Status der Aufgabenstellung nur rendern, wenn es schon eine &Uuml;bung dazu gibt.
    aView.renderExcerciseTextTitle()
    // 
    // add "assemble exercise" button
    $("#content").append("<br/><a class=\"button takeon\" href=\"javascript:aView.handleExcerciseAndApproach()\"" 
      + " alt=\"Aufgabe suchen\" title=\"Aufgabe annehmen\">Aufgabe suchen</a><br/><br/>")
    // ### if our user had already the joy to meet this excercise-text, present his/her excercise
    if (aView.allExcercises.length > 0) {
      var excercise = aView.renderExcerciseHistoryForUser()
      if (typeof excercise === "object" ) {
        // excercise was taken-on, but an approach was not submitted yet
        aView.currentExcercise = excercise
        aView.renderExcerciseObject(excercise.composite["tub.eduzen.excercise_object"])
        $("#content").append("Du hast die Aufgabe angenommen aber noch keinen L&ouml;sungsvorschlag dazu eingereicht. "
          + "Das k&ouml;nntest du jetzt tun.")
          .append("<br/><br/><span class=\"button new-approach\">Jetzt versuchen</span><br/><br/><br/>")
        $(".button.takeon").remove()
        $("#sample-solution").remove()
        $(".button.new-approach").click(aView.renderApproachForm)
      }
    }
  }

  this.renderExcerciseTextTitle = function () {
    var eName = aView.currentExcerciseText.value
    var eText = aView.currentExcerciseText.composite["tub.eduzen.excercise_description"].value
    $("#content").append("<b class=\"label excercise-text\">Ok, hier ist deine Aufgabenstellung</b><br/><br/>")
      .append("<div class=\"excercise-text\">" + eText + "</div>")
  }

  this.renderSampleSolutionForExcerciseText = function() {
    // FIXME: load sample solution for excercise-text, not part of this lecture, but part of the topicalarea
    if (aView.sampleApproach != undefined) {
      var e_text = aView.currentExcerciseText
      var e_text_descr = e_text.composite["tub.eduzen.excercise_description"].value
      var sample_content = aView.sampleApproach.composite["tub.eduzen.approach_content"].value
      var exampleHtml = "<div id=\"sample-solution\"><b class=\"label\">Hier mal eine Beispielaufgabe</b><br/><br/>"
      exampleHtml += e_text_descr + "<br/><br/><b class=\"label\">"
        +" Und hier ist der dazugeh&ouml;rige L&ouml;sungsansatz</b><br/><br/>"+ sample_content  +"</b><br/><br/></div>"
      $("#content").html(exampleHtml)
    }
  }

  this.renderApproachForm = function  () {
    var uploadPath = "/"
    // ### 
    var submissionLabel = "<label for=\"excercise-input\">Bitte trage die L&ouml;sung bzw. den L&ouml;sungsweg hier ein</label><br/>"
    var submission = "<form name=\"approach-submission\" action=\"javascript:aView.submitApproachToExcercise()\">"
      + "<textarea type=\"text\" name=\"excercise-input\" rows=\"4\" size=\"120\"></textarea><br/>"
      + "<span class=\"label upload\">Alternativ kannst du auch ein Foto deiner handschriftlichen, aber leserlichen "
      + " Berechnungen abgeben. Lade dazu Bitte die Datei <a class=\"button upload\""
      + " href=\"#\" alt=\"Bild hochladen\ title=\"Bild hochladen\">hier hoch</a>.</span><br/><br/>"
      + "<input type=\"submit\" value=\"Aufgabe einreichen\" class=\"button submit\"></input>"
      + "</form>"
    $("#content").append(submissionLabel).append(submission)
    $(".button.upload").click(aView.open_upload_dialog(uploadPath, aView.handleUploadResponse))
    // $(".button.submit").click(aView.submitApproachToExcercise)
  }

  this.renderExcerciseObject = function (eObject) {

    $("#content").append("<b class=\"label\">Und hier ist die zu berechnende Aufgabe</b><br/><br/>")
    $("#content").append("<p class=\"excercise-object\">" + eObject.value + "</p><br/<br/>")
  }

  this.renderOptionsAfterSubmission = function () {

    $("#content").html("<p class\"buffer\"><b class=\"label\">Dein L&ouml;sungsvorschlag f&uuml;r die "
      + "Aufgabenstellung \"" + aView.currentExcerciseText.value + "\" haben wir nun im System abgespeichert.</b></p>")
    .append("<p class\"buffer\"><b class=\"label\">Du kannst jetzt z.B.:</b><ul class=\"options\">"
      + "<li><a href=\"" + host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/" + aView.currentTopicalarea.id + "\">"
      + "weitere Aufgabenstellungen aus dem Themenkomplex \"" + aView.currentTopicalarea.value + "\" entgegennehmen</a></li>"
      + "<li><a href=\"" + host + "/eduzen/view/submissions\">"
      + "Korrekturen zu all deinen eingereichten Aufgaben abrufen</a></li>"
      + "<li><a href=\"" + host + "/eduzen/view/start\">"
      + "oder auch einen Blick in andere Themenkomplexe deiner Lehrveranstaltung werfen</a></li>"
      + "</ul>Viel Erfolg!</p>")
  }

  this.renderOptionsAfterSubmission = function () {

    $("#content").html("<p class\"buffer\"><b class=\"label\">Dein L&ouml;sungsvorschlag f&uuml;r die "
      + "&Uuml;bung zu \"" + aView.currentExcerciseText.value + "\" wurde sicher entgegengenommen.</b></p>")
    .append("<p class\"buffer\"><b class=\"label\">Du kannst jetzt z.B.:</b><ul class=\"options\">"
      + "<li><a href=\"" + host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/" + aView.currentTopicalarea.id + "/etext/"+ aView.currentExcerciseText.id +"\">"
      + "Den bisherigen Verlauf und m&ouml;gliche Korrekturen zu dieser &Uuml;bung hier einsehen</a></li>"
      + "<li><a href=\"" + host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/" + aView.currentTopicalarea.id + "\">"
      + "weitere Aufgabenstellungen aus dem Themenkomplex \"" + aView.currentTopicalarea.value + "\" entgegennehmen</a></li>"
      + "<li><a href=\"" + host + "/eduzen/view/start\">"
      + "oder auch einen Blick in andere Themenkomplexe deiner Lehrveranstaltung werfen</a></li>"
      + "</ul>Viel Erfolg!</p>")
  }

  /** Rendering all submissions of our current user **/

  this.renderAllExcercisesList = function () {
    // unused
    $("#header").append("<b class=\"\">Eine Auflistung all deiner bisher eingereichten &Uuml;bungen</b>")
    var itemList = "<ul>"
    for (item in aView.allExcercises) {
      // display excercise-text for each taken excercise
      var excercise = dmc.get_topic_by_id(aView.allExcercises[item].id, true)
      itemList += "<li>" + excercise.value + "</li>"
    }
    itemList += "</ul>"
    $("#content").html(itemList)
  }

  /** Rendering all tries for any given excercise-text and our current user **/
  this.renderExcerciseHistoryForUser = function () {
    for (item in aView.allExcercises) {
      var excercise = dmc.get_topic_by_id(aView.allExcercises[item].id)
      // use the first approach representing a taken-excercise
      var approach = excercise.composite["tub.eduzen.approach"]
      var e_text_state = aView.getExcerciseTextState(aView.currentExcerciseText.id).status
      if (approach == undefined) {
        // ### 
        // excercise was taken-on but no approach was submitted yet
        return excercise
      } else {
        $("#content").append("<br/><b class=\"label history\">Historie</b> Du hast bisher "+ aView.allExcercises.length 
            + " &Uuml;bung/en zu dieser Aufgabenstellung bearbeitet.").append("&nbsp;&nbsp;&nbsp;"
            + "<b class=\"label\">Aufgabenstellung</b>&nbsp;<b>"+ dict.stateName(e_text_state) +"</b>")
        $("#content").append("<ul id=\"taken-excercises\">")
        approach = approach[0] // render just the first approach, here in this excercises overview
        var name = approach.composite["tub.eduzen.timeframe_note"].value
        var state = aView.getExerciseState(excercise.id).excercise_state
        var listItem = "<li class=\"taken-excercise\">" 
            + "<span class=\"name\" id=\""+ excercise.id +"\"><a id=\"a-"+ excercise.id +"\" href=\"#\">"+ name +"</a></span><br/>"
            + "<span class=\"count\">"+ excercise.composite["tub.eduzen.approach"].length +"&nbsp;Versuch/e</span>"
            + "<span class=\"state\">Status der &Uuml;bung: "+ dict.stateName(state) +"</span>"
          + "</li>"
        $("#taken-excercises").append(listItem)
        $("#"+ excercise.id).click(create_approach_handler(excercise))
        $("#a-"+ excercise.id).click(create_approach_handler(excercise))
        if (aView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
      }
    }
    
    function create_approach_handler (excercise) {
      return function (e) {
        // aView.currentExcercise = excercise
        // aView.renderExcerciseApproachInfo()
        var excerciseLink = aView.currentExcerciseText.id +"/excercise/"+ excercise.id // rel. without slash at start
        window.location.href = excerciseLink // fixme, use push/pop history
      }
    }

    return true
  }

  /** 
    * Rendering all tries for any given excercise-text and our current user
    * TODO: remove duplicated code from #approach_view.renderExcerciseInfo
    */
  this.renderExcerciseApproachInfo = function () {
    var excercise = aView.currentExcercise
    var excerciseText = excercise.composite["tub.eduzen.excercise_text"]
    var excerciseDescription = excerciseText.composite["tub.eduzen.excercise_description"]
    var excerciseObject = excercise.composite["tub.eduzen.excercise_object"]
    var e_text_state = aView.getExcerciseTextState(excerciseText.id).status
    // Page Header
    aView.renderHeader("excercise")
    // Page Body
    $("#content").html("<b class=\"label\">Aufgabenstellung</b><br/>" + excerciseDescription.value +"<br/><br/>")
    $("#content").append("<b class=\"label\">Aufgabe</b><br/>" + excerciseObject.value +"<br/><br/>")
    if (e_text_state != "tub.eduzen.solved") {
      $("#content").append("<span class=\"button new-approach\">Neuer Versuch</span><br/><br/><br/>")
    }
    $("#content").append("<b class=\"label\">Eingereichte L&ouml;sungsversuche</b>"
      + "<div id=\"approach-info\"><ul class=\"approach-list\"></ul></div>")
    var approaches = excercise.composite["tub.eduzen.approach"]
    // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
    var numberOfApproach = 1;
    for (item in approaches ) {
      var approach = approaches[item]
      var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
      // var state = approach.composite["tub.eduzen.approach_correctness"].value
      var state = aView.getApproachState(approach.id).status
      var content = approach.composite["tub.eduzen.approach_content"].value
      var comments = aView.getCommentsForApproach(approach.id)
      var approachLink = excercise.id +"/approach/"+ approach.id
      // Page Item
      var commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Neues Kommentar verfassen\""
        + "title=\"Neues Kommentar verfassen\">Neues Kommentar verfassen</a>"
      if (comments.total_count > 0) {
        commentsLink = "<a href=\"#\" class=\"btn "+ approach.id +" comment\" alt=\"Alle Kommentare anzeigen\""
        + "title=\"Alle Kommentare anzeigen\">Alle Kommentare anzeigen</a>"
      }
      var listItem = "<li class=\"approach\">"
          + "<span class=\"submitted\">"+ numberOfApproach +". Versuch, eingereicht um <a id=\""+ approach.id +"\" href=\""
            + approachLink +"\">"+ timestamp +"</a></span>"
          + "<b class=\"label\">ist <span class=\"darkstate\">\""+ dict.stateName(state) +"\"</span><br/>"
          + "<div class=\"content\">"+ content +"</div>"
          + "<span class=\"comments\">"+ commentsLink +"</span>"
        + "</li>"
      $(".approach-list").append(listItem)
      $(".btn."+ approach.id +".comment").click(create_comment_handler(approach))
      if (aView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
      numberOfApproach++
    }

    $(".button.new-approach").click(aView.renderApproachForm)

    function create_comment_handler (approach) {
      return function(e) {
        aView.renderCommentsForApproach(approach)
        aView.renderCommentFormForApproach(approach)
      }
    }
  }

  this.renderCommentsForApproach = function(approach) {
    $("#content").append("<ul id=\"comment-list\">")
    $("#comment-list").empty()
    var comments = aView.getCommentsForApproach(approach.id)
    console.log("   rendering all "+ comments.total_count +" comments for approach .. ")
    if (comments.total_count > 0) {
      aView.existingComments = comments
      for (c in comments.items) {
        var comment = dmc.get_topic_by_id(comments.items[c].id, true)
        var author = aView.getAuthorOfComment(comment.id).items[0]
        var explanation = comment.composite["tub.eduzen.comment_explanation"].value
        author = (author == undefined) ? author = "anonymus" : author.value
        var commentView = "<li class=\"comment\">"+ author +" sagt der Vorschlag ist "
          + dict.stateName(comment.value) +"<br/>"
          + explanation +"</li>"
        $("#comment-list").append(commentView)
      }
    }
  }

  this.renderCommentFormForApproach = function(approach) {
    $("#new-comment").remove()
    var form = "<div id=\"new-comment\"><b class=\"label\">Inhalt deines Kommentars</b>"
      + "<form name=\"comment\" id=\"new-comment-form\" action=\"javascript:void(0);\">"
      + "<input class=\"inputfield\" type=\"text\" size=\"80\" rows=\"4\"></input><br/>"
      + "<label for=\"is-correct\">Den L&ouml;sungsvorschlag find ich korrekt"
      + "<input class=\"is-correct\" name=\"is-correct\" type=\"checkbox\"></input></label>"
      + "<input class=\"btn comment\" type=\"submit\" value=\"Kommentieren\"></input>"
      + "</form></div>"
    $("#content").append(form)
    $("#new-comment-form").submit(do_comment_handler(approach))

    function do_comment_handler(approach) {
      return function() {
        var correctness = $("#new-comment-form .is-correct").is(":checked")
        var value = $("#new-comment-form .inputfield").val()
        aView.doCommentApproach(approach, value, correctness)
      }
    }
  }

  /** 
   * Controler to take on an excercise with an approach 
   * Input:  TUB-Identity, Excercise Text, Excercise Object, Approach Value, File, Timestamp
   * Output: TUB-Identity <author> Excercise (<composedof> Excercise Text AND <composedof> Excercise Object) 
   *         <aggregate> Approach Composite :which_can_haz: <content_item> File
   **/

  this.submitApproachToExcercise = function () {
    // 1) submission: create + relate approach to that excercise
    var submittedValue = $("[name=excercise-input]").val()
    var approach = aView.createApproachForExcercise(submittedValue) // along with excercise-object, if necessary
    if (!approach) throw new Error("Approach could not be submitted. Something went wrong.")
    // 2) submission: attach a possibly submitted file-upload to this appraoch
    if (aView.currentFileApproach != undefined) {
      // and relate the just uploaded file-topic to our approach
      var approachFilemodel = { "type_uri":"tub.eduzen.content_item", 
        "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
        "role_2":{"topic_id":aView.currentFileApproach.topic_id, "role_type_uri":"dm4.core.part"}
      }
      dmc.create_association(approachFilemodel)
      console.log("deBG: related newly uploaded file to approach via \"tub.eduzen.content_item\"")
    }
    // ## render time take for excercise
    // approach to excercise was submitted, render options
    aView.renderOptionsAfterSubmission()
  }

  this.createExcerciseForUser = function () {
    // 1) create Excercise, relate it to excerciseTextId and relate it to userId 
    var eText = aView.currentExcerciseText
    if (user.identity == undefined) throw new Error("Your User-Account has no TUB-Identity. Cannot take excercises.")
    if (eText == undefined) throw new Error("Something mad happened. Please try again.")
    // FIXME: set current time user has taken this excercise on server or never
    var excercise = dmc.create_topic({ "type_uri": "tub.eduzen.excercise"})
    // ### to clarify: anonymous excercise topics or something like..
    // "#" + eText.id + " on " + new Date().getDate() + "/" + new Date().getMonth() + "/" + new Date().getYear()})

    // update client side model, there is a new object
    aView.currentExcercise = excercise
    var excerciseTextModel = { "type_uri":"dm4.core.aggregation", 
      "role_1":{"topic_id":excercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":eText.id, "role_type_uri":"dm4.core.part"}
    }
    // 2) persist current excercise-object of our freshly assembled excercise
    var eObjectModel = { "type_uri":"dm4.core.aggregation",
      "role_1":{"topic_id":aView.currentExcercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":aView.currentExcerciseObject.id, "role_type_uri":"dm4.core.part"}
    }
    dmc.create_association(eObjectModel)
    console.log("dEBUG: saved excercise-objects => "
      + aView.currentExcerciseObject.id + " to current excercise => " + aView.currentExcercise.id)
    // 3) relate author to it as submitter
    var authorModel = { "type_uri":"tub.eduzen.submitter", 
      "role_1":{"topic_id":user.identity.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(excerciseTextModel)
    dmc.create_association(authorModel)
    console.log("dEBUG: saved \""+ user.identity.value +"\" as \"submitter\" to newly created excercise " + excercise.id)
  }

  this.createApproachForExcercise = function (value) {
    var approachModel = { "type_uri": "tub.eduzen.approach", "composite": {
        "tub.eduzen.approach_content": value,
        "tub.eduzen.timeframe_note": new Date().getTime().toString(),
        "tub.eduzen.approach_correctness": "ref_uri:tub.eduzen.approach_undecided",
        "tub.eduzen.approach_sample": false
    }}
    var approach = dmc.create_topic(approachModel)
    if (approach == undefined || aView.currentExcercise == undefined) throw new Error("Something mad happened.")
    var approachExcercisemodel = { "type_uri":"dm4.core.composition", 
      "role_1":{"topic_id":aView.currentExcercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":approach.id, "role_type_uri":"dm4.core.part"}
    }
    dmc.create_association(approachExcercisemodel)
    console.log("dEBUG: saved new approach => " + approach.id + " to current excercise => " + aView.currentExcercise.id)
    return approach
  }



  /** Approach View Helpers  **/

  this.handleExcerciseAndApproach = function () {
    // get an excercise-object if available and display it along with an approach form
    // TODO: REST-Service Methode to deliver a proper excercise-object for this exercise-text and this user,
    // TODO: and to create a new Excercise to persist whihc excercise the user has already seen for this e-text
    // render excercise-text header
    $("#content").empty()
    aView.renderExcerciseTextTitle()
    var eObject = aView.getExcerciseObjects(aView.currentExcerciseText.id)
    if (eObject.total_count == 0) {
      // FIXME: either there is really no object related to the excercise-text (already self-contained)
      // or there is none fresh left for this user.
    } else if (eObject.total_count >= 1) {
      var object = eObject.items[0]
      // update client side model
      aView.currentExcerciseObject = object
      // 1) take on: create excercise and relate it to current user
      aView.createExcerciseForUser()
      aView.renderExcerciseObject(aView.currentExcerciseObject)
      // FIXME: clean up rendering of this view
      aView.renderApproachForm()
    }
  }

  this.handleUploadResponse = function (response) {
    aView.currentFileApproach = response
    if (aView.currentFileApproach.file_name.indexOf("deepamehta-files") == 0) {
      return undefined // no file given
    } else {
      var fileResponseHTML = "<br/><br/>Die Datei \""
        + aView.currentFileApproach.file_name + "\" wurde zur Abgabe hochgeladen."
      $(".label.upload").append(fileResponseHTML)
      // ### allow users to delete their just accidentially uploaded file..
    }
  }

  this.getExcerciseTextUrl = function() {
      return host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/"
          + aView.currentTopicalarea.id +"/etext/"+ aView.currentExcerciseText.id
  }

  this.getTopicalareaUrl = function() {
      return host + "/eduzen/view/lecture/"
          + aView.currentLectureId + "/topicalarea/"+ aView.currentTopicalarea.id
  }

  /** Server Communications - Strictly persisting server and updating client side model **/
  /** Methods to access eduzen, deepamehta-core and accesscontrol REST-Services **/

  /** Make this work for a single excercise, state will of ET will be provided by an explicit server-method */
  this.getStateOfApproach = function (approachId) {
    // get sate of excercise/approach
  }

  this.loadExcercisesForExcerciseText = function(eTextId) {
    var usersExcercisesForExcerciseText = new Array()
    // FIXME: assemble this on the server-side, get excercises just by this author
    if (user.identity == undefined) {
      console.log("Please login first.")
      return false
    } else {
      var excercisesByUser = aView.getAllExcercisesByUser()
      console.log("debug: user has taken excercise-text "+ eTextId +", searching for "+ excercisesByUser)
      if (excercisesByUser != undefined) {
        for (element in excercisesByUser) {
          var excercise = excercisesByUser[element]
          var eTexts = dmc.get_topic_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.excercise_text",
            "assoc_type_uri": "dm4.core.aggregation"}) // eText plays "Part"-Role here
          if (eTexts.total_count > 0) { // one excercise has always just one excercise_text assigned
            // just add those excercises, dealing with this excercise-text
            if (eTextId == eTexts.items[0].id) {
              usersExcercisesForExcerciseText.push(excercise)
            }
          }
        }
        aView.allExcercises = usersExcercisesForExcerciseText
        return true
      } else {
        return false
      }
    }
  }

  /** Server Communications - Strictly returning raw data **/

  this.doCommentApproach = function(approach, value, isCorrect) {
    // ### FIXME: recheck for still-existing user
    console.log(" do comment this approiach wiht " + value)
    // ### FIXME: strip input to API.. ;)
    var newComment = { "type_uri": "tub.eduzen.comment", "composite": {
        "tub.eduzen.comment_correct": isCorrect,
        "tub.eduzen.comment_explanation": value
    }}
    var savedComment = dmc.create_topic(newComment)
    if (savedComment == undefined) throw new Error("Something mad happened.")
    var commentApproachModel = { "type_uri":"dm4.core.composition", 
      "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.part"}
    }
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":savedComment.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":user.user.id, "role_type_uri":"dm4.core.default"}
    }
    dmc.create_association(commentApproachModel)
    dmc.create_association(authorModel)
    console.log("    saved comment => " + isCorrect + "  approach: " + approach.id + " for author: " + user.user.value)
    // refresh content area
    aView.renderExcerciseApproachInfo()
  }

  this.isSampleApproachAvailable = function (eTextId) {
    // fixme: needs a server side method to better select sample-solutions for an excercise-text
    var excercises = dmc.get_topic_related_topics(eTextId, {"others_topic_type_uri": "tub.eduzen.excercise"})
    if (excercises.total_count > 0) { // FIXME: optimize on server-side
      for (taken in excercises.items) { // get all approaches submitted to this excercise
        var excerciseId = excercises.items[taken].id
        var approaches = dmc.get_topic_related_topics(excerciseId, {"others_topic_type_uri": "tub.eduzen.approach"})
        if (approaches.total_count > 0) { // find sample solutions..
          for (a in approaches.items) { // get all approaches marked as sample solution
            var approach = approaches.items[a]
            approach = dmc.get_topic_by_id(approach.id, true)
            // sanity check, some approaches have no value set here..
            if (approach.composite["tub.eduzen.approach_sample"]) {
              if (approach.composite["tub.eduzen.approach_sample"].value) {
                aView.sampleApproach = approach
                return true
              } 
            }
          }
        } else {
          console.log("WARNING: no approaches submitted for eText " + eTextId)
        }
      }
    }
    return false
  }

  this.getExcerciseTextState = function(id) {
    return dmc.request("GET", "/eduzen/state/exercise-text/" + id, undefined, undefined, undefined, false)
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getAuthorOfComment = function (commentId) {
    return dmc.get_topic_related_topics(commentId,
      {"others_topic_type_uri": "dm4.accesscontrol.username", "assoc_type_uri": "tub.eduzen.author"})
  }

  this.getExerciseState = function(exerciseId) {
    return dmc.request("GET", "/eduzen/state/exercise/"+ exerciseId, undefined, undefined, undefined, false)
  }

  this.getApproachState = function(approachId) {
    return dmc.request("GET", "/eduzen/state/approach/"+ approachId, undefined, undefined, undefined, false)
  }

  this.getAllExcercisesByUser = function () {
    if (user.identity == undefined) throw new Error("Your User Account has now TUB Identity, so no submitted approaches.")
    var excercises = dmc.get_topic_related_topics(user.identity.id, {"others_topic_type_uri": "tub.eduzen.excercise", 
      "assoc_type_uri": "tub.eduzen.submitter"})
    return (excercises.total_count > 0) ? excercises.items : undefined
  }

  this.getCommentsForApproach = function (approachId) {
    return dmc.get_topic_related_topics(approachId,
      {"others_topic_type_uri": "tub.eduzen.comment", "assoc_type_uri": "dm4.core.composition"})
  }

  this.getFileContent = function (topicId) {
    var files = dmc.get_topic_related_topics(topicId, {"others_topic_type_uri": "dm4.files.file", 
      "assoc_type_uri": "tub.eduzen.content_item"})
    return (files.total_count > 0) ? files.items : undefined
  }

  this.getExcerciseObjects = function (excerciseTextId) {
    return dmc.request("GET", "/eduzen/exercise-object/"+ excerciseTextId, undefined, undefined, undefined, false)
  }

  /** HTML5 History API utility methods **/

  this.popHistory = function (state) {
    if (!aView.historyApiSupported) return
    // do handle pop events
  }

  this.pushHistory = function (state, link) {
    if (!aView.historyApiSupported) return
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }



  /** GUIToolkit Helper Methods copied from dm4-webclient module **/

  /**
   * @param   path        the file repository path (a string) to upload the selected file to. Must begin with "/".
   * @param   callback    the function that is invoked once the file has been uploaded and processed at server-side.
   *                      One argument is passed to that function: the object (deserialzed JSON)
   *                      returned by the (server-side) executeCommandHook. ### FIXDOC
   */
  this.open_upload_dialog = function(new_path, callback) {

    // 1) install upload target
    var upload_target = $("<iframe>", {name: "upload-target"}).hide()
    $("body").append(upload_target)

    // 2) create upload dialog
    var upload_form = $("<form>", {
      method:  "post",
      enctype: "multipart/form-data",
      target:  "upload-target"
    })
    .append($('<input type="file">').attr({name: "file", size: 60}))
    .append($('<input class=\"button\" type="submit">').attr({value: "Upload"}))
    //
    var upload_dialog = aView.ui.dialog({title: "Upload File", content: upload_form})

    // 3) create dialog handler
    return function() {
      upload_form.attr("action", "/files/" + new_path) // new path is currently static file-repo root
      upload_dialog.open()
      // bind handler
      upload_target.unbind("load")    // Note: the previous handler must be removed
      upload_target.load(upload_complete)

      function upload_complete() {
        upload_dialog.close()
        // Note: iframes must be accessed via window.frames
        var response = $("pre", window.frames["upload-target"].document).text()
        try {
          callback(JSON.parse(response))
        } catch (e) {
          alert("Upload failed: \"" + response + "\"\n\nException=" + JSON.stringify(e))
        }
      }
    }
  }

}

$(window).load(aView.initViews)
