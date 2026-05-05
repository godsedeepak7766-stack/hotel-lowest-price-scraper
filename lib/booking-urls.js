/**
 * Build Booking.com URLs from parameters (stable, interview-friendly: less brittle than UI clicks).
 */

function buildSearchUrl(city) {
  const params = new URLSearchParams({
    ss: city,
    group_adults: "2",
    group_children: "1",
    age: "0",
    no_rooms: "1",
    selected_currency: "INR",
    nflt: "class=5",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function buildHotelPriceUrl(hotelUrl, checkIn, checkOut) {
  const u = new URL(hotelUrl);
  u.searchParams.set("checkin", checkIn);
  u.searchParams.set("checkout", checkOut);
  u.searchParams.set("group_adults", "2");
  u.searchParams.set("group_children", "1");
  u.searchParams.set("age", "0");
  u.searchParams.set("no_rooms", "1");
  u.searchParams.set("selected_currency", "INR");
  return u.toString();
}

module.exports = { buildSearchUrl, buildHotelPriceUrl };
