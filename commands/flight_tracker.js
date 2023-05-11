const axios = require('axios');
const fs = require('fs');

// Path to the flight data JSON file
const flightsJsonPath = `${__dirname}/flights.json`;

module.exports = {
    name: 'track',
    aliases: ['flight'],
    description: 'Tracks Flights And Sends Updates.',
    roles: ['modeer'],
    execute: async(client, message, args) => {

        // Check if any flight number is given
        if(args.length <= 0) return await client.reply(message.from,"You must specify a flight number.",message.id)
        
        // Parse flight number to uppercase
        let flightNumber = args[0].toUpperCase()

        // Load the existing flight data from JSON file
        const flightsJson = JSON.parse(fs.readFileSync(flightsJsonPath))

        // Prepare an array to store phone numbers of those who want to track the flight
        let oldNumbers = []

        // If the flight is already being tracked, add the phone number to the list
        if (flightNumber in flightsJson) {
            console.log("Flight Already Being Tracked! Adding Phone Number To List..")
            oldNumbers = flightsJson[flightNumber].numbers
        }

        // If the user's phone number is not in the stored list, add it
        if (!(oldNumbers.includes(message.from))) oldNumbers.push(message.from)

        // Fetch flight id using flight number (Used by the flightradar24 api)
        const flightIdResponse = await getFlightId(flightNumber)

        // If the flight id could not be fetched, return an error message
        if (!flightIdResponse.success) {
            console.log("Failed To Fetch Flight Id")
            return await client.reply(message.from, flightIdResponse.apiResponseMessage, message.id)
        }

        // Fetch flight details using flight id
        const flightDetailsResponse = await getFlightDetails(flightIdResponse.flightId,true,oldNumbers)

        // Prepare the flight tracking message
        const newDetails = flightDetailsResponse.flightDetails
        let replyText =  `🚨 TRACKING FLIGHT 🚨\n\n✈️ Flight No.: ${newDetails.flightNumber}\n🌎 Route: ${newDetails.departureAirport} -> ${newDetails.arrivalAirport}\n🛫 Departure: ${newDetails.departureTime}\n⏰ Scheduled Arrival: ${newDetails.scheduledArrival}\n🛬 Estimated Arrival: ${newDetails.estimatedArrival}\n📡 Status: ${newDetails.flightStatus}`
        // Print message for debugging purposes
        console.log(replyText) 
        await client.reply(message.from,replyText, message.id)
        },

    checkFlights: async(client)=>{

        // Load the existing flights data from JSON file
        const flightsJson = JSON.parse(fs.readFileSync(flightsJsonPath))

        // Check each flight in the flight data
        for (let flightNumber in flightsJson) {
            // If the flight has already landed, skip it
            if (flightsJson[flightNumber].flightStatus.toUpperCase().includes("LANDED")) {
                console.log("Skipping " + flightNumber + "...") // Debugging
                continue
            }
    
            // Store the old flight details to compare them later
            const oldDetails = flightsJson[flightNumber]
    
            // Fetch flight id using flight number
            const flightIdResponse = await getFlightId(flightNumber)
    
            // If the flight id could not be fetched, skip to the next flight
            if (!flightIdResponse.success) {
                console.log("Failed To Fetch Flight Id")
                continue 
            }
    
            // Fetch the new flight details using flight id
            const flightDetailsResponse = await getFlightDetails(flightIdResponse.flightId,true,oldDetails.numbers)
    
            // If the flight details could not be fetched, skip to the next flight
            if (!flightDetailsResponse.success) {
                console.log("Failed To Fetch Flight Details")
                continue
            }

            // Check if any flight details have changed
            const newDetails = flightDetailsResponse.flightDetails
            if (newDetails.departureTime != oldDetails.departureTime || newDetails.estimatedArrival != oldDetails.estimatedArrival || newDetails.flightStatus != oldDetails.flightStatus) {
                // Prepare the flight update message
                let updateText = `🚨 FLIGHT UPDATE DETECTED 🚨\n\n✈️ Flight No.: ${newDetails.flightNumber}\n🌎 Route: ${newDetails.departureAirport} -> ${newDetails.arrivalAirport}\n🛫 Departure: ${newDetails.departureTime}\n⏰ Scheduled Arrival: ${newDetails.scheduledArrival}\n⌚️ Estimated Arrival: ${newDetails.estimatedArrival}\n📡 Status: ${newDetails.flightStatus}`
                
                // Send the flight update message to each phone number in the list
                for (let number of newDetails.numbers) {
                    await client.sendText(number, updateText);
                }
    
            }
    
    
    
        }
    },
};

// Function to fetch flight id using flight number
async function getFlightId(flightNumber) {
    let apiResponseMessage;
    let flightId;
    let success;
    await axios.get("https://www.flightradar24.com/v1/search/web/find?limit=10&query=" + flightNumber)
        .then((response) => {
            if (response.status != 200) {
                success = false
                apiResponseMessage = "getFlightId API returned status code: " + response.status
                console.log("getFlightId API returned status code: " + response.status)
                return
            }
  
            let flights = response.data.results.filter((result) => result.type == "live" && result.detail.flight == flightNumber.toUpperCase())
       
            if (flights.length <= 0) {
                success = false
                apiResponseMessage = "No Flights Found"
                return
            }
            success = true;
            flightId = flights[0].id
        })
        .catch((error) => {
            console.error("getFlightId Error: ", error);
            success = false
            apiResponseMessage = "getFlightId Axios caught an error: " + error
            return

        });
    return { success, apiResponseMessage, flightId }

}
async function getFlightDetails(flightId, writeToFile, numbers) {
    let flightDetails = { flightNumber: null, departureTime: null, departureAirport: null, arrivalAirport: null, scheduledArrival: null, estimatedArrival: null, flightStatus: null, flightMessage: null, numbers }
    let apiResponseMessage;
    let success;
    await axios.get("https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=" + flightId)
        .then((response) => {
            if (response.status != 200) {
                success = false
                apiResponseMessage = "API returned status code: " + response.status
                return
            }
    
            success = true
            const flight = response.data
            apiResponseMessage = "Successfully Found Flight!"
            flightDetails.flightNumber = flight.identification.number.default
            flightDetails.flightMessage = flight.status.text
            flightDetails.departureAirport = flight.airport.origin.code.iata
            flightDetails.arrivalAirport = flight.airport.destination.code.iata
        
            flightDetails.departureTime = flight.time.real.departure ?? flight.time.scheduled.departure
            flightDetails.scheduledArrival = flight.time.scheduled.arrival
            flightDetails.estimatedArrival = flight.time.real.arrival ?? flight.time.estimated.arrival
            flightDetails.departureTime = convertTimestamp(flightDetails.departureTime)
            flightDetails.scheduledArrival = convertTimestamp(flightDetails.scheduledArrival)
            flightDetails.estimatedArrival = convertTimestamp(flightDetails.estimatedArrival)
            const altitude = flight.trail[0].alt
            const lastTrailTs = flight.trail[0].ts
            flightDetails.flightStatus = flight.time.real.arrival != null? `Landed at ${flightDetails.estimatedArrival}`: flightDetails.flightMessage
            if (altitude < 50 && !flightDetails.flightStatus.toUpperCase().includes("LANDED")) flightDetails.flightStatus = `Landed based on low altitude: ${altitude}ft at ${convertTimestamp(lastTrailTs)}` 
            return
        })
        .catch((error) => {

            console.error("Error: ", error);
            success = false
            apiResponseMessage = "Axios caught an error: " + error
            return
        });

    if (writeToFile && success) {
        try {
            const flightsJson = JSON.parse(fs.readFileSync(flightsJsonPath))
            flightsJson[flightDetails.flightNumber] = flightDetails
            fs.writeFileSync(`${__dirname}/flights.json`, JSON.stringify(flightsJson));
        } catch (err) {
            console.error('Add To Flights Json Error:', err)

            apiResponseMessage = 'Failed To Add To Json File'
        }
    }

    return { success, apiResponseMessage, flightDetails };
}
function convertTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
  
    const formattedTime = `${hours}:${minutes} - ${day}/${month}`;
    return formattedTime;
  }


  
