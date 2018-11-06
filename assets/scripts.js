
function parseEvents(data) {
  if (data && Array.isArray(data)) {
    return templateEvents(data);
  } else {
    console.error("JSON data has invalid format.", data);
    throw new Error("JSON data must be an array.");
  }
}

function templateEvents(data) {
  moment.locale('no');

  const eventArray = [];

  const jsrender = window.jsrender;
  const template = jsrender.templates("#meetupTemplate");
  const htmlOutput = template.render(data);

  const meetupNode = document.getElementById("#replaceMeetupList");
  meetupNode.html(htmlOutput);

  data.forEach(event => {
    const name = event.name;
    const time = moment(new Date(event.time)).format("dddd, MMMM DD, HH:mm");

    eventArray.push({name, time});
  });
}

function getOSWAEvents() {
  const url = "http://api.meetup.com/Oslo-Software-Architecture/events" + getFields();
  return getEvents(url);
}

function getEvents(url) {
  return fetch(url)
  .then(data => {
    return data.json();
  }).catch(function(ex) {
    console.error('Could not get events.', ex);
  });
}

function getFields() {
  return "?&photo-host=public&page=20" + // &sign=true
  "&fields=featured_photo,short_link,past_event_count_inclusive"; // plain_text_no_images_description
}
