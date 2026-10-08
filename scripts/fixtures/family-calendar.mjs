// Legacy feature tests isolate calendar I/O. Dedicated calendar tests exercise
// the real loader, actions and route integration; this is not hosted evidence.
export const calendarFixture = {
  loadFamilyCalendar: async () => ({ timeZone: null, revision: 0, today: new Date().toISOString().slice(0,10) }),
  calendarLabel: () => 'Using UTC until your family owner chooses a time zone in Settings',
  shortCalendarDate: date => new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)),
};
