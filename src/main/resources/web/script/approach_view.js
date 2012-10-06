/** 
 * A prototype to list contents of a Lehrveranstaltung and Excercises.
 **/

var host = "http://localhost:8080"
var serviceURL = "/core"
var authorClientURL = "/de.deepamehta.webclient"
var dmc = new RESTClient(host + serviceURL)
var dict = new eduzenDictionary("DE")

var aView = new function () {

  this.historyApiSupported = window.history.pushState
  this.ui = undefined

  this.user = undefined
  this.tub = undefined

  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLectureId = undefined // FIXME: move to uView, support many
  this.currentExcercise = undefined
  this.currentExcerciseObject = undefined
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
    // log-in check
    aView.user = aView.getCurrentUser()
    if (aView.user == null) {
      aView.renderHeader()
      return undefined
    }
    aView.tub = aView.loadTUBIdentity()
    aView.ui = new GUIToolkit() // used to create new upload-dialog

    var entryUrl = window.location.href
    // handling deep links
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
          console.log("  load excercise-view for => " + excerciseTextId)
        }
      }
      if (!aView.currentLectureId) throw new Error("No current Lecture was set. Try to log out and log in again.")
      // init approach view for topicalarea and possibly an excercise.
      aView.initApproachView(topicalareaId, excerciseTextId, excerciseId)
    } else if (commands[0] === "submissions") {
      console.log("why not load all submitted approachs and comments to it..")
      aView.initSubmissionsView()
    }
  }

  this.initApproachView = function (topicalareaId, excerciseTextId, excerciseId) {
    if (topicalareaId != undefined) {
      aView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
      aView.renderHeader()
      // ### render general infos for topicalarea
      if (excerciseTextId != undefined) {
        aView.currentExcerciseText = dmc.get_topic_by_id(excerciseTextId, true)
        if (excerciseId != undefined) {
          aView.currentExcercise = dmc.get_topic_by_id(excerciseId, true)
          // deep linking into excercise-info view
          aView.renderExcerciseInfo()
        } else {
          // deep linking into excercise-text overview, fetch excercise-history
          aView.loadExcercisesForExcerciseText(excerciseTextId)
          // render excercise-text with all taken excercises
          aView.renderExcerciseText() // current excercise was set by url
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

  this.renderHeader = function () {
      $(".eduzen").addClass("approach-view")
      aView.renderUser()
  }

  this.renderUser = function () {
    if (aView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutze zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $("#header").hide()
      $(".info").html("Hi <a href=\"/eduzen/view/user/" + aView.user.id + "\" class=\"username\"> "
        + aView.user.value + "</a>")
    }
  }

  this.renderExcerciseText = function () {
    var eId = aView.currentExcerciseText.id
    var eName = aView.currentExcerciseText.value
    var eText = aView.currentExcerciseText.composite["tub.eduzen.excercise_description"].value
    var approaches = undefined
  
    $("<b class=\"label\">Hier ist die Aufgabenstellung \"" + eName + "\"</b><br/><br/>").insertBefore("#bottom")
    $("<div class=\"excercise-text\">"
      + eText + "</div><br/><br/>").insertBefore("#bottom")
    // 
    // add submission button
    $("#content").append("<a class=\"button takeon\" href=\"javascript:aView.handleExcerciseAndApproach()\"" 
      + " alt=\"Aufgabenstellung entgegennehmen\" title=\"Aufgabenstellung entgegennehmen\">"
      + "Aufgabenstellung entgegennehmen</a><br/><br/>")
    // if user had already the joy to meet this excercise-text
    if (aView.allExcercises.length > 0) {
      $("#content").append("<br/><b class=\"label\">Historie</b> Du hast bisher "+ + aView.allExcercises.length 
        + " &Uuml;bungen zu dieser Aufgabenstellung bearbeitet")
      aView.renderExcerciseHistory()
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
    $(submissionLabel).insertBefore("#bottom")
    $(submission).insertBefore("#bottom")
    $(".button.upload").click(aView.open_upload_dialog(uploadPath, aView.handleUploadResponse))
    // $(".button.submit").click(aView.submitApproachToExcercise)
  }

  this.renderExcerciseObject = function (eObject) {

    $("<b class=\"label\">Und hier ist die zu berechnende Aufgabe</b><br/><br/>").insertBefore("#bottom")
    $("<p class=\"excercise-object\">" + eObject.value + "</p><br/<br/>").insertBefore("#bottom")
  }

  this.renderOptionsAfterSubmission = function () {

    $("#content").html("<p class\"buffer\"><b class=\"label\">Dein L&ouml;sungsvorschlag f&uuml;r die "
      + "Aufgabenstellung \"" + aView.currentExcerciseText.value + "\" haben wir nun im System abgespeichert.</b></p>")
    $("#content").append("<p class\"buffer\"><b class=\"label\">Du kannst jetzt z.B.:</b><ul class=\"options\">"
      + "<li><a href=\"" + host + "/eduzen/view/lecture/" + aView.currentLectureId + "/topicalarea/" + aView.currentTopicalarea.id + "\">"
      + "weitere Aufgabenstellungen aus dem Themenkomplex \"" + aView.currentTopicalarea.value + "\" entgegennehmen</a></li>"
      + "<li><a href=\"" + host + "/eduzen/view/submissions\">"
      + "Korrekturen zu all deinen eingereichten Aufgaben abrufen</a></li>"
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
  this.renderExcerciseHistory = function () {
    $("#content").append("<ul id=\"taken-excercises\">")
    for (item in aView.allExcercises) {
      var excercise = dmc.get_topic_by_id(aView.allExcercises[item].id)
      // use the first approach representing a taken-excercise
      var approach = excercise.composite["tub.eduzen.approach"][0]      
      // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
      var name = approach.composite["tub.eduzen.timeframe_note"].value
      var state = approach.composite["tub.eduzen.approach_correctness"].value
      var listItem = "<li class=\"taken-excercise\">" 
          + "<span class=\"name\" id=\""+ excercise.id +"\"><a id=\"a-"+ excercise.id +"\" href=\"#\">"+ name +"</a></span><br/>"
          + "<span class=\"count\">"+ excercise.composite["tub.eduzen.approach"].length +"&nbsp;Versuch/e</span>"
          + "<span class=\"state "+ state + "\">Status: "+ state +"</span>"
        + "</li>"
      $("#taken-excercises").append(listItem)
      $("#"+ excercise.id).click(create_approach_handler(excercise))
      $("#a-"+ excercise.id).click(create_approach_handler(excercise))
      if (aView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
      
      function create_approach_handler (excercise) {
        return function (e) {
          aView.currentExcercise = excercise
          aView.renderExcerciseInfo()
          var excerciseLink = aView.currentExcerciseText.id +"/excercise/"+ excercise.id // rel. without slash at start
          window.location.href = excerciseLink // fixme, use push/pop history
        }
      }
    }
  }

  /** 
    * Rendering all tries for any given excercise-text and our current user
    * TODO: "render" mission as accomplished, if the first approach was correct, otherwise render "in progress"
    */
  this.renderExcerciseInfo = function () {
    var excercise = aView.currentExcercise
    $("#content").html("<b class=\"label\">&Uuml;bungsverlauf zur Aufgabenstellung \""
      + aView.currentExcerciseText.value +"\"</b><div id=\"approach-info\"><ul></ul></div>")
    var approaches = excercise.composite["tub.eduzen.approach"]
    // "tub.eduzen.approach_content" | "tub.eduzen.approach_correctness" | "tub.eduzen.timeframe_note"
    var numberOfApproach = 1;
    for (item in approaches ) {
      var approach = approaches[item]
      var timestamp = approach.composite["tub.eduzen.timeframe_note"].value
      var state = approach.composite["tub.eduzen.approach_correctness"].value
      var content = approach.composite["tub.eduzen.approach_content"].value
      var comments = aView.getCommentsForApproach(approach.id)
      /** var approachIs = "tub.eduzen.approach_undecided"
      console.log("       loaded " + comments.total_count + " comments on this taken excercise (with approachId=" + approachId + ")")
      if (comments.total_count > 0) {
        aView.existingComments = comments
        if(aView.hasCorrectComment(comments)) {
          approachIs = "tub.eduzen.approach_correctness"
          console.log("       comments speak, this taken excercise was correct. " + excercise.id)
        }
      } **/
      var approachLink = excercise.id +"/approach/"+ approach.id
      var listItem = "<li class=\"approach\">"
          + "<span class=\"submitted\">"+ numberOfApproach + ". Versuch, eingereicht um <a id=\""+ approach.id +"\" href=\""
            + approachLink +"\">"+ timestamp +"</a></span><br/>"
          + "<div class=\"content\">"+ content + "</div>"
          + "<span class=\"state "+ state + "\">Status: "+ state +"</span>"
          + "<span class=\"comments\">"+ comments.total_count +"&nbsp;Kommentar/e</span>"
        + "</li>"
      $("#approach-info").append(listItem)
      if (aView.getFileContent(approach.id)) console.log("debug: render approach list_entry with file symbol..") // ###
    }
  }

  /** 
   * Controler to take on an excercise with an approach 
   * Input:  TUB-Identity, Excercise Text, Excercise Object, Approach Value, File, Timestamp
   * Output: TUB-Identity <author> Excercise (<composedof> Excercise Text AND <composedof> Excercise Object) 
   *         <aggregate> Approach Composite :which_can_haz: <content_item> File
   **/

  this.submitApproachToExcercise = function () {
    // 1) create excercise and relate it to current user
    aView.createExcerciseForUser()
    // 2) create + relate approach to that excercise
    var submittedValue = $("[name=excercise-input]").val()
    var approach = aView.createApproachForExcercise(submittedValue) // along with excercise-object, if necessary
    if (!approach) throw new Error("Approach could not be submitted. Something went wrong.")
    // attach a possibly submitted file-upload to this appraoch
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
    // create Excercise, relate it to excerciseTextId and relate it to userId 
    var eText = aView.currentExcerciseText
    if (aView.tub == undefined) throw new Error("Your User-Account has no TUB-Identity. Cannot take excercises.")
    if (eText == undefined) throw new Error("Something mad happened. Please try again.")
    // ### to clarify: author of approach or author of excercise, taking the latter
    // FIXME: set current time user has taken this excercise on server or never
    var excercise = dmc.create_topic({ "type_uri": "tub.eduzen.excercise"})
    // ### to clarify: anonymous excercise topics or something like..
    // "#" + eText.id + " on " + new Date().getDate() + "/" + new Date().getMonth() + "/" + new Date().getYear()})

    // update client side model, there is a new object
    aView.currentExcercise = excercise
    // ### maybe use submitter instead of author, double check
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":aView.tub.id, "role_type_uri":"dm4.core.default"},
      "role_2":{"topic_id":excercise.id, "role_type_uri":"dm4.core.default"}
    }
    var excerciseTextModel = { "type_uri":"dm4.core.aggregation", 
      "role_1":{"topic_id":excercise.id, "role_type_uri":"dm4.core.whole"},
      "role_2":{"topic_id":eText.id, "role_type_uri":"dm4.core.part"}
    }
    dmc.create_association(authorModel)
    dmc.create_association(excerciseTextModel)
    console.log("dEBUG: saved identity related to newly created excercise and excercise-text")
  }

  this.createApproachForExcercise = function (value) {
    // persist the given excercise-object if existing as it is integral part of a just, freshly assembled excercise
    if (aView.currentExcerciseObject != undefined) {
      var eObjectModel = { "type_uri":"dm4.core.aggregation",
        "role_1":{"topic_id":aView.currentExcercise.id, "role_type_uri":"dm4.core.whole"},
        "role_2":{"topic_id":aView.currentExcerciseObject.id, "role_type_uri":"dm4.core.part"}
      }
      dmc.create_association(eObjectModel)
      console.log("dEBUG: saved excercise-objects => "
        + aView.currentExcerciseObject.id + " to current excercise => " + aView.currentExcercise.id)
    } else {
      console.log("INFO: current excercise was self-contained and did not need an excercise-object..")
    }
    var approachModel = { "type_uri": "tub.eduzen.approach", "composite": {
        "tub.eduzen.approach_content": value,
        "tub.eduzen.timeframe_note": new Date().getTime(),
        "tub.eduzen.approach_correctness": "ref_uri:tub.eduzen.approach_undecided"
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
    $(".button.takeon").remove()
    // if we have at least one excercise-object, we assume users have to take it.
    var eObject = aView.getExcerciseObject(aView.currentExcerciseText.id)
    if (eObject == undefined) {
      // thats it, the excercise-text is already self-contained
    } else {
      // update client side model
      aView.currentExcerciseObject = eObject
      aView.renderExcerciseObject(eObject)
    }
    aView.renderApproachForm()
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

  this.hasCorrectComment = function (comments) {
    // TODO:
    for (item in aView.allExcercises) {
      var comment = dmc.get_topic_by_id(aView.allExcercises[item].id)
      console.log("         ??? hasCorrectComment=" + JSON.stringify(comment))
    }
  }



  /** Server Communications - Strictly persisting server and updating client side model **/
  /** Methods to access eduzen, deepamehta-core and accesscontrol REST-Services **/

  /** Make this work for a single excercise, state will of ET will be provided by an explicit server-method */
  this.getStateOfApproach = function (approachId) {
    // get sate of excercise/approach
  }

  /** implicit in model this is ..
  this.getApproachForExcercise = function (excerciseId) {
    dmc.get_topic_related_topics(eTextId, {"others_topic_type_uri": "tub.eduzen.excercise",
    "assoc_type_uri": "dm4.core.aggregation"})
    return dmc.get_topic_related_topics(excerciseId,
      {"others_topic_type_uri": "tub.eduzen.approach", "assoc_type_uri": "dm4.core.composition"})
  } **/

  this.loadExcercisesForExcerciseText = function(eTextId) {
    var usersExcercises = new Array()
    // FIXME: assemble this on the server-side, get excercises just by this author
    if (!aView.tub) throw new Error("User has not a TUB Identity yet, skipping view.")
    var excercisesByUser = aView.getAllExcercisesByUser()
    // console.log("debug: user has taken " + allExcercisesByUser.total_count + " excercises in total")
    if (excercisesByUser != undefined) {
      for (element in excercisesByUser) {
        var excercise = excercisesByUser[element]
        var eTexts = dmc.get_topic_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.excercise_text",
          "assoc_type_uri": "dm4.core.aggregation"}) // eText plays "Part"-Role here
        if (eTexts.total_count > 0) { // one excercise has always just one excercise_text assigned
          // console.log("debug: filtering to excercises by user taken on this excercise-text "
            // + eTextId + "(" + eTexts.items[0].id + ")")
          if (eTextId == eTexts.items[0].id) {
            usersExcercises.push(excercise)
          }
        }
      }
      aView.allExcercises = usersExcercises
    }
  }

  this.loadTUBIdentity = function () {
    var ids = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity"})
    return (ids.total_count > 0) ? dmc.get_topic_by_id(ids.items[0].id, true) : undefined
  }

  this.loadLecturesUserIsParticipatingIn = function () {
    if (!aView.tub) throw new Error("Your User Account has now TUB Identity, so no submitted approaches.")
    // get "username"-id, to get "tub.eduzen.identity"-id to then find related lectures
    var identity = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity", 
      "assoc_type_uri": "dm4.core.aggregation"}).items[0]
    return dmc.get_topic_related_topics(identity.id, {"others_topic_type_uri": "tub.eduzen.lecture", 
      "assoc_type_uri": "tub.eduzen.participant"})
  }

  /** Server Communications - Strictly returning raw data **/

  this.getAllExcercisesByUser = function () {
    if (!aView.tub) throw new Error("Your User Account has now TUB Identity, so no submitted approaches.")
    var approaches = dmc.get_topic_related_topics(aView.tub.id, {"others_topic_type_uri": "tub.eduzen.excercise", 
      "assoc_type_uri": "tub.eduzen.author"})
    return (approaches.total_count > 0) ? approaches.items : undefined
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

  this.getExcerciseObject = function (excerciseTextId) {
    // method to find a compatible excercise-object for our currentExcercise, 
    // ### which was not used yet by user, unsaved
    var compatibleObjects = dmc.get_topic_related_topics(excerciseTextId, 
      {"others_topic_type_uri": "tub.eduzen.excercise_object", "assoc_type_uri": "tub.eduzen.compatible"})
    return (compatibleObjects.total_count > 0) ? compatibleObjects.items[0] : undefined // just take one
  }

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
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
