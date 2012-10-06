package de.deepamehta.plugins.eduzen.excercise;

import java.util.logging.Logger;
import java.util.Set;

import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.WebApplicationException;
import java.io.InputStream;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.service.Plugin;   
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.plugins.eduzen.excercise.service.ExcerciseViewService;

@Path("/eduzen/view")
@Produces("application/json")
@Consumes("application/json")
public class ExcerciseViewPlugin extends PluginActivator implements ExcerciseViewService {

    private Logger logger = Logger.getLogger(getClass().getName());

    public ExcerciseViewPlugin() {
        logger.info(".stdOut(\"Hello Zen-Student!\")");
    }

    @GET
    @Path("/start")
    @Produces("text/html")
    @Override
    public InputStream getStartView(@HeaderParam("Cookie") ClientState clientState) {
        // logger.info("viewId: " + viewId + " typeId: " + typeId + " topicId: " + topicId);
        logger.info("loading eduzen start-view.. ");
        /** @PathParam("viewId") String viewId, @PathParam("typeId") String typeId, 
        @PathParam("topicId") String topicId,  **/
        return invokeStartView();
    }

    @GET
    @Path("/user/{id}")
    @Produces("text/html")
    @Override
    public InputStream getUserView(@PathParam("id") long userId, @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen user-view for userId: " + userId + " ...");
        /** @PathParam("viewId") String viewId, @PathParam("typeId") String typeId, 
        @PathParam("topicId") String topicId,  **/
        return invokeUserView();
    }

    @GET
    @Path("/lecture/{lectureId}")
    @Produces("text/html")
    @Override
    public InputStream getLectureView(@PathParam("lectureId") long lectureId, 
        @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen lecture-view for lecture: " + lectureId);
        /** @PathParam("viewId") String viewId, @PathParam("typeId") String typeId, 
        @PathParam("topicId") String topicId,  **/
        return invokeStartView();
    }

    @GET
    @Path("/lecture/{lectureId}/topicalarea/{topicalareaId}")
    @Produces("text/html")
    @Override
    public InputStream getLectureTopicalareaView(@PathParam("lectureId") long lectureId, 
        @PathParam("topicalareaId") long topicalareaId, @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen lecture-view for lecture: " + lectureId + " and/ topicalarea " + topicalareaId);
        return invokeStartView();
    }

    @GET
    @Path("/topicalarea/{topicalareaId}")
    @Produces("text/html")
    @Override
    public InputStream getTopicalareaView(@PathParam("topicalareaId") long topicalareaId, 
        @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen topicalarea-view for topicalarea: " + topicalareaId);
        return invokeApproachView();
    }

    @GET
    @Path("/lecture/{lectureId}/topicalarea/{topicalareaId}/etext/{excerciseTextId}")
    @Produces("text/html")
    @Override
    public InputStream getTopicalareaExcerciseTextView(@PathParam("lectureId") long lectureId,
        @PathParam("topicalareaId") long topicalareaId, @PathParam("excerciseTextId") long excerciseTextId, 
        @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen topicalarea-view for lecture " + lectureId + ", topicalarea " + topicalareaId
          + " and/ excercise " + excerciseTextId);
        return invokeApproachView();
    }

    @GET
    @Path("/lecture/{lectureId}/topicalarea/{topicalareaId}/etext/{excerciseTextId}/excercise/{excerciseId}")
    @Produces("text/html")
    @Override
    public InputStream getTopicalareaExcerciseView(@PathParam("lectureId") long lectureId,
        @PathParam("topicalareaId") long topicalareaId, @PathParam("excerciseTextId") long excerciseTextId, 
        @PathParam("excerciseId") long excerciseId, @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen topicalarea-view for lecture " + lectureId + ", topicalarea " + topicalareaId
          + " and/ etext " + excerciseTextId + " and excercise " + excerciseId);
        return invokeApproachView();
    }

    @GET
    @Path("/lectures")
    @Produces("text/html")
    @Override
    public InputStream getLecturesView(@HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen lectures-view .. NOT YET IMPLEMENTED");
        return invokeApproachView();
    }

    @GET
    @Path("/submissions")
    @Produces("text/html")
    @Override
    public InputStream getSubmittedApproachesView(@HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen submission-view .. ");
        return invokeApproachView();
    }

    @GET
    @Path("/commenting")
    @Produces("text/html")
    @Override
    public InputStream getCommentingView(@HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen commenting-view .. ");
        return invokeCommentView();
    }

    @GET
    @Path("/commenting/excercise/{excerciseId}")
    @Produces("text/html")
    @Override
    public InputStream getCommentingView(@PathParam("excerciseId") long excerciseId, 
        @HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen commenting-view .. for " + excerciseId);
        return invokeCommentView();
    }



    // ------------------------------------------------------------------------------------------------ Private Methods

    private InputStream invokeStartView() {
        try {
            return dms.getPlugin("de.tu-berlin.eduzen.task-views").getResourceAsStream("web/index.html");
        } catch (Exception e) {
            throw new WebApplicationException(e);
        }
    }

    private InputStream invokeUserView() {
        try {
            return dms.getPlugin("de.tu-berlin.eduzen.task-views").getResourceAsStream("web/user.html");
        } catch (Exception e) {
            throw new WebApplicationException(e);
        }
    }

    private InputStream invokeApproachView() {
        try {
            return dms.getPlugin("de.tu-berlin.eduzen.task-views").getResourceAsStream("web/approach.html");
        } catch (Exception e) {
            throw new WebApplicationException(e);
        }
    }
    
    private InputStream invokeCommentView() {
        try {
            return dms.getPlugin("de.tu-berlin.eduzen.task-views").getResourceAsStream("web/comment.html");
        } catch (Exception e) {
            throw new WebApplicationException(e);
        }
    }

}
