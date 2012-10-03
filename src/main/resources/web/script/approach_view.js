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
  this.currentTopicalareas = new Array()
  this.currentTopicalarea = undefined
  this.currentExcerciseTexts = new Array()
  this.currentExcerciseText = undefined
  this.currentLecture = undefined // FIXME: move to uView, support many
  this.currentExcercise = undefined
  this.currentExcerciseObject = undefined
  this.currentApproach = undefined
  this.currentFileApproach = undefined

  /** excercise View application controler **/

  this.initViews = function () {
    aView.ui = new GUIToolkit() // used to create new upload-dialog
    aView.user = aView.getCurrentUser()
    // handling deep links
    var entryUrl = window.location.href
    entryUrl = entryUrl.substr(entryUrl.indexOf("view/") + 5)
    console.log("entry point => " + entryUrl.split("/"))
    commands = entryUrl.split("/")
    var entity = commands[0]
    var topicalareaId = commands[1]
    var excerciseId = undefined
    if (entity === "topicalarea") {
      console.log("load topicalarea-view for => " + topicalareaId)
      if (commands[2] === "etext") {
        excerciseId = commands[3]
        console.log("  load excercise-view for => " + excerciseId)
      }
      aView.initApproachView(topicalareaId, excerciseId)
    } else if (entity === "lectures") {
      aView.renderHeader()
      console.log("why not loading all lectures a user is partcipating in..")
      console.log(aView.loadLecturesUserIsParticipatingIn())
      // ### todo: laod available lectures via "tub.eduzen.identity", implement this in uView
      // push new application state /topicalarea/id
    }
  }

  this.initApproachView = function (topicalareaId, excerciseId) {
    if (topicalareaId != undefined) {
      aView.currentTopicalarea = dmc.get_topic_by_id(topicalareaId)
      aView.renderHeader()
      // ### render general infos for topicalarea
      if (excerciseId != undefined) {
        aView.currentExcerciseText = dmc.get_topic_by_id(excerciseId, true)
        aView.renderExcercise() // current excercise, set by url
      } else {
        // ### or all other excercises from within our current topicalarea
        // aView.renderAllExcercises()
        console.log(dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.excercise", 
          "assoc_type_uri": "tub.eduzen.author"}))
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

  this.renderHeader = function () {
      $(".eduzen").addClass("approach-view")
      aView.renderUser()
  }

  this.renderExcercise = function () {
    var eId = aView.currentExcerciseText.id
    var eName = aView.currentExcerciseText.value
    var eText = aView.currentExcerciseText.composite["tub.eduzen.excercise_description"].value
    $("<b class=\"label\">Hier ist die Aufgabenstellung</b><br/><br/>").insertBefore("#bottom")
    $("<div class=\"excercise-text\">" + eName + "<br/><br/>"
      + eText + "</div><br/><br/>").insertBefore("#bottom")   
    $("#content").append("<a class=\"button takeon\" href=\"javascript:aView.getExcerciseAndApproach()\"" 
      + " alt=\"Aufgabenstellung entgegennehmen\" title=\"Aufgabenstellung entgegennehmen\">"
      + "Aufgabenstellung entgegennehmen</a>")
  }

  this.renderUser = function () {
    if (aView.user == undefined) {
      // ### FIXME uView.renderLogin()
      $(".title").html("Bitte nutzen Sie zum einloggen vorerst die <a href=\"" 
        + host + authorClientURL + "\">Autorenoberfl&auml;che</a> und laden danach diese Seite erneut.")
    } else {
      $("#header").remove()
      $(".info").html("Hi <a href=\"/eduzen/view/user/" + aView.user.id + "\" class=\"username\"> "
        + aView.user.value + "</a>, ")
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

  /** Controler to take on an excercise with an approach **/

  this.submitApproachToExcercise = function () {
    // 1) create excercise
    aView.createExcerciseForUser()
    // 2) create + relate approach to it
    var submittedValue = $("[name=excercise-input]").val()
    var approach = aView.createApproachForExcercise(submittedValue) // along with excercise-object, if necessary
    if (!approach) throw new Error("Approach could not be submitted. Something went wrong.")
    // and with a possibly submitted file-upload to this appraoch, too
    if (aView.currentFileApproach != undefined) {
      // also relate the just uploaded file-topic to our approach
      var approachFilemodel = { "type_uri":"tub.eduzen.content_item", 
        "role_1":{"topic_id":approach.id, "role_type_uri":"dm4.core.whole"},
        "role_2":{"topic_id":aView.currentFileApproach.topic_id, "role_type_uri":"dm4.core.part"}
      }
      dmc.create_association(approachFilemodel)
      console.log("deBG: related newly uploaded file to approach via \"tub.eduzen.content_item\"")
    }
    // render happy faces..
  }

  this.createExcerciseForUser = function () {
    // create Excercise, relate it to excerciseTextId and relate it to userId 
    var tub = aView.getTUBIdentity()
    var eText = aView.currentExcerciseText
    if (tub == undefined || eText == undefined) throw new Error("Something mad happened. Please try again.")
    // ### to clarify: author of approach or author of excercise, taking the latter
    // FIXME: set current time user has taken this excercise on server or never
    var excercise = dmc.create_topic({ "type_uri": "tub.eduzen.excercise"})
    // ### to clarify: anonymous excercise topics or something like..
    // "#" + eText.id + " on " + new Date().getDate() + "/" + new Date().getMonth() + "/" + new Date().getYear()})

    // update client side model, there is a new object
    aView.currentExcercise = excercise
    // ### maybe use submitter instead of author, double check
    var authorModel = { "type_uri":"tub.eduzen.author", 
      "role_1":{"topic_id":tub.id, "role_type_uri":"dm4.core.default"},
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
        "tub.eduzen.timeframe_note": "Date of Today", 
        "tub.eduzen.approach_correctness": "#id:tub.eduzen.approach_undecided" 
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

  this.getExcerciseAndApproach = function () {
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

  this.getExcerciseObject = function (excerciseTextId) {
    // method to find a compatible excercise-object for our currentExcercise, 
    // ### which was not used yet by user, unsaved
    var compatibleObjects = dmc.get_topic_related_topics(excerciseTextId, 
      {"others_topic_type_uri": "tub.eduzen.excercise_object", "assoc_type_uri": "tub.eduzen.compatible"})
    return (compatibleObjects.total_count > 0) ? compatibleObjects.items[0] : undefined // just take one
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

  this.getTUBIdentity = function () {
    var ids = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity"})
    return (ids.total_count > 0) ? dmc.get_topic_by_id(ids.items[0].id, true) : undefined
  }

  this.loadLecturesUserIsParticipatingIn = function () {
    if (aView.user == undefined) return undefined
    // get "username"-id, to get "tub.eduzen.identity"-id to then find related lectures
    var identity = dmc.get_topic_related_topics(aView.user.id, {"others_topic_type_uri": "tub.eduzen.identity", 
      "assoc_type_uri": "dm4.core.aggregation"}).items[0]
    return dmc.get_topic_related_topics(identity.id, {"others_topic_type_uri": "tub.eduzen.lecture", 
      "assoc_type_uri": "tub.eduzen.participant"})
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

  /** Methods to access eduzen and accesscontrol REST-Services **/

  this.getCurrentUser = function() {
    return dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, false)
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

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
