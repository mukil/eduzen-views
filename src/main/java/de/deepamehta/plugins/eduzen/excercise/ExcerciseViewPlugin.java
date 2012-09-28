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
    public InputStream getLectureView(@PathParam("lectureId") long lectureId, @HeaderParam("Cookie") ClientState clientState) {
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
        /** @PathParam("viewId") String viewId, @PathParam("typeId") String typeId, 
        @PathParam("topicId") String topicId,  **/
        return invokeStartView();
    }

    @GET
    @Path("/lectures")
    @Produces("text/html")
    @Override
    public InputStream getLecturesView(@HeaderParam("Cookie") ClientState clientState) {
        logger.info("loading eduzen lectures-view .. ");
        /** @PathParam("viewId") String viewId, @PathParam("typeId") String typeId, 
        @PathParam("topicId") String topicId,  **/
        return invokeUserView();
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
    

}
