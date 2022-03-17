/* The maximum number of minutes in a period (a day) */

const MAX_IN_PERIOD = 1440;

const calculateEnergy = (
  { initial, events },
  { lastStateCondition, currentStateCondition, irrelevantState }
) => {
  if (initial !== 'on' && initial !== 'off' && initial !== 'auto-off') {
    throw 'initial must be on or off or auto-off';
  }

  let lastState = initial;
  let lastTimestamp = 0;
  let energy = 0;

  events.forEach(({ state, timestamp }) => {
    if (lastTimestamp > timestamp) {
      throw 'events must be in timestamped order';
    }

    if (lastState === lastStateCondition && state === currentStateCondition) {
      energy += timestamp - lastTimestamp;
    }

    if (lastState === currentStateCondition) {
      lastTimestamp = timestamp;
    }
    if (state !== irrelevantState) {
      lastState = state;
    }
  });

  // if state is on in the last event, then we should add the minutes to the end of the day in too
  if (lastState === lastStateCondition) {
    energy += MAX_IN_PERIOD - lastTimestamp;
  }
  return Math.min(energy, MAX_IN_PERIOD);
};

/**
 * PART 1
 *
 * You have an appliance that uses energy, and you want to calculate how
 * much energy it uses over a period of time.
 *
 * As an input to your calculations, you have a series of events that contain
 * a timestamp and the new state (on or off). You are also given the initial
 * state of the appliance. From this information, you will need to calculate
 * the energy use of the appliance i.e. the amount of time it is switched on.
 *
 * The amount of energy it uses is measured in 1-minute intervals over the
 * period of a day. Given there is 1440 minutes in a day (24 * 60), if the
 * appliance was switched on the entire time, its energy usage would be 1440.
 * To simplify calculations, timestamps range from 0 (beginning of the day)
 * to 1439 (last minute of the day).
 *
 * HINT: there is an additional complication with the last two tests that
 * introduce spurious state change events (duplicates at different time periods).
 * Focus on getting these tests working after satisfying the first tests.
 *
 * The structure for `profile` looks like this (as an example):
 * ```
 * {
 *    initial: 'on',
 *    events: [
 *      { state: 'off', timestamp: 50 },
 *      { state: 'on', timestamp: 304 },
 *      { state: 'off', timestamp: 600 },
 *    ]
 * }
 * ```
 */

const calculateEnergyUsageSimple = ({ initial, events }) => {
  return calculateEnergy(
    { initial, events },
    { lastStateCondition: 'on', currentStateCondition: 'off' }
  );
};

/**
 * PART 2
 *
 * You purchase an energy-saving device for your appliance in order
 * to cut back on its energy usage. The device is smart enough to shut
 * off the appliance after it detects some period of disuse, but you
 * can still switch on or off the appliance as needed.
 *
 * You are keen to find out if your shiny new device was a worthwhile
 * purchase. Its success is measured by calculating the amount of
 * energy *saved* by device.
 *
 * To assist you, you now have a new event type that indicates
 * when the appliance was switched off by the device (as opposed to switched
 * off manually). Your new states are:
 * * 'on'
 * * 'off' (manual switch off)
 * * 'auto-off' (device automatic switch off)
 *
 * (The `profile` structure is the same, except for the new possible
 * value for `initial` and `state`.)
 *
 * Write a function that calculates the *energy savings* due to the
 * periods of time when the device switched off your appliance. You
 * should not include energy saved due to manual switch offs.
 *
 * You will need to account for redundant/non-sensical events e.g.
 * an off event after an auto-off event, which should still count as
 * an energy savings because the original trigger was the device
 * and not manual intervention.
 */

const calculateEnergySavings = ({ initial, events }) => {
  return calculateEnergy(
    { initial, events },
    {
      lastStateCondition: 'auto-off',
      currentStateCondition: 'on',
      irrelevantState: 'off',
    }
  );
};

/**
 * PART 3
 *
 * The process of producing metrics usually requires handling multiple days of data. The
 * examples so far have produced a calculation assuming the day starts at '0' for a single day.
 *
 * In this exercise, the timestamp field contains the number of minutes since a
 * arbitrary point in time (the "Epoch"). To simplify calculations, assume:
 *  - the Epoch starts at the beginning of the month (i.e. midnight on day 1 is timestamp 0)
 *  - our calendar simply has uniform length 'days' - the first day is '1' and the last day is '365'
 *  - the usage profile data will not extend more than one month
 *
 * Your function should calculate the energy usage over a particular day, given that
 * day's number. It will have access to the usage profile over the month.
 *
 * It should also throw an error if the day value is invalid i.e. if it is out of range
 * or not an integer. Specific error messages are expected - see the tests for details.
 *
 * (The `profile` structure is the same as part 1, but remember that timestamps now extend
 * over multiple days)
 *
 * HINT: You are encouraged to re-use `calculateEnergyUsageSimple` from PART 1 by
 * constructing a usage profile for that day by slicing up and rewriting up the usage profile you have
 * been given for the month.
 */

const isInteger = (number) => Number.isInteger(number);

const calculateEnergyUsageForDay = ({ initial, events }, day) => {
  if (!isInteger(day)) {
    throw 'must be an integer';
  }
  if (day <= 0 || day > 365) {
    throw 'day out of range';
  }

  if (events.length === 0) {
    return calculateEnergyUsageSimple({ initial, events });
  }

  const endTime = day * MAX_IN_PERIOD;
  const startTime = endTime - MAX_IN_PERIOD;

  // we need to set the initial by using the state before our day starts
  const startIndex = events.findIndex(({ timestamp }) => timestamp > startTime);

  if (startIndex < 0) {
    // we should check last state and return day of energy use if on or 0 if off
    return events[events.length-1].state === 'on' ? MAX_IN_PERIOD : 0;
  }
  // if startTime is greater than last event timestamp then we use the last event state as initial state.
  let updatedInitial;
  if (startIndex === 0) {
    updatedInitial = initial;
  } else {
    updatedInitial =
      startIndex >= 1
        ? events[startIndex - 1].state
        : events[events.length - 1].state;
  }

  // we need to get the event that goes past >= our end time and modify the timestamp to midnight
  let endIndex = events.findIndex(({ timestamp }) => timestamp >= endTime);
  if (endIndex === -1) {
    endIndex = events.length - 1;
  }

  // normalize our day to 'day timestamps' for ease of calculations
  const dayEvents = events.slice(startIndex, endIndex + 1).map((day) => ({
    ...day,
    timestamp: day.timestamp - startTime,
  }));

  // make sure the last event is capped at midnight, if the last event is the last event in the month then we can add an 'off' event at midnight
  if (dayEvents[dayEvents.length - 1].timestamp > MAX_IN_PERIOD) {
    dayEvents[dayEvents.length - 1] = {
      ...dayEvents[dayEvents.length - 1],
      timestamp: MAX_IN_PERIOD,
    };
  } else {
    dayEvents.push({
      state: 'off',
      timestamp: MAX_IN_PERIOD,
    });
  }

  return calculateEnergyUsageSimple({
    initial: updatedInitial,
    events: dayEvents,
  });
};

module.exports = {
  calculateEnergyUsageSimple,
  calculateEnergySavings,
  calculateEnergyUsageForDay,
  MAX_IN_PERIOD,
};
