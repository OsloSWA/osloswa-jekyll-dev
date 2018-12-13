moment.locale('nb');

function parseEvents(data) {
  if (data && Array.isArray(data)) {
    return templateEvents(data);
  } else {
    console.error("JSON data has invalid format.", data);
    throw new Error("JSON data must be an array.");
  }
}

function templateEvents(data) {
  if (!data || data.length === 0) return;

  const eventArray = [];
  data.forEach(event => {
    const name = event.name;
    const description = event.description;
    const time = moment(new Date(event.time)).format('LLLL'); // UTC start time of the event, in milliseconds since the epoch
    const shortlink = event.short_link;
    const venue = event.venue;
    const yes_rsvp_count = event.yes_rsvp_count;
    const waitlist_count = event.waitlist_count;
    const web_actions = event.web_actions;
    const status = event.status;
    eventArray.push({
        name,
        description,
        status,
        time: time.charAt(0).toUpperCase() + time.slice(1),
        shortlink, venue, yes_rsvp_count, waitlist_count, web_actions
    });
  });

  const past = eventArray.filter(event => event.status === 'past');
  const upcoming = eventArray.filter(event => event.status === 'upcoming');

  render("#pastTemplate", "pastMeetupList", past.reverse());
  render("#upcomingTemplate", "upcomingMeetupList", upcoming);
}

function render(templateName, element, data) {
    if (!data || data.length === 0) return;
    const template = $.templates(templateName);
    document
        .getElementById(element)
        .innerHTML = template.render({events: data});
}

function getOSWAEvents() {
  return getEvents("https://api.meetup.com/Oslo-Software-Architecture/events" + getFields() + getSigns());
}

function getEvents(url) {
    return $.ajax({
        url: url,
        dataType: 'jsonp'}).then(result => {
        return result.data;
    })
}

/**
 * See Meetup.com API docs for more
 * information:
 * https://www.meetup.com/meetup_api/docs/
 *
 * @returns {string} URL with field parameters combined.
 */
function getFields() {
  const fields = [
      "id",
      "featured_photo",
      "short_link", // A shortened link for the event on meetup.com
      "rsvp_limit", // The number of "yes" RSVPS an event has capacity for
      "past_event_count_inclusive", // Number of past events that happened before and including this event
      "how_to_find_us",
      "event_hosts", // .name, .intro, .photo.photo_link, .join_date,  .photo.thumb_link, .photo.highres_link
      "featured" // Boolean indicator of whether or not a given event is featured
  ];

  const allFields = fields.reduce((p, n) => p + "," + n);
  return "?&photo-host=public&&scroll=future_or_past&page=10&fields="+allFields;
}

function getSigns() {
    return "&sig_id=35117512&sig=a23d1f0c980d04eb0be9cf101d7160e733e0b97d"
}

function loadMeetups() {
    getOSWAEvents().then(events => {
        parseEvents(events);
    });
}

loadMeetups();