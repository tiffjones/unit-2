//declare map variable globally so all functions have access
var map;
var dataStats = {};

function createMap(){

    //create the map
    map = L.map('map', {
        center: [44, -87.5],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12,
    });

    //add OSM base tilelayer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};

// Find minimum value of the data for scaling the prop symbols
function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    // new value for zero values present in the data
    var valforZeros = 0.00001;
    //loop through each beach
    for(var beach of data.features){
        //loop through each year
        for(var year = 2016; year <= 2024; year+=1){
            //get percentage value for current year
            var value = beach.properties["Perc_Exc_"+ String(year)];
            // conditional to reassign zero values to 0.00001
            if (value === 0){
                var value = valforZeros;
            };
            //add value to array
            allValues.push(value);
        }
    }

    console.log("e.coli values:" + allValues);

    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    console.log("min: " + dataStats.min);

    //calculate maxValue
    dataStats.max = Math.max(...allValues);
    console.log("max: "+ dataStats.max);

    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;
    console.log("mean: "+ dataStats.mean)
}

//calculate the radius of each proportional symbol using Flannery Scaling
function calcPropRadius(attValue) {


    //constant factor adjusts symbol sizes evenly
    var minRadius = 4; //gives zero values a min size for visibility on the map
    var reduceVar = 500000 //needed to reduce values since range of values made some sylmbols overwhelm the map
    var adjValue = attValue/reduceVar
    var radius = 1.0083 * Math.pow(adjValue/dataStats.min,0.5715) * minRadius
    return radius;
};

//use OOC to define createPopupContent
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.year = attribute.slice(9);
    this.ecoli = this.properties[attribute];
    this.formatted = "<span style=font-family:'Cambria'>" + this.properties.Beach_Name + " Beach</span><p><big>[ </big><b><big>" + this.ecoli + "%  </big></b>" + "<big> ] </big><i>Elevated E. coli Levels in </small></i>" + "<i><b>" + this.year + "</i></b>";
    //this.formatted = "<p><b><big>" + this.year + "</big></b></p>" + '<b>' + this.properties.Beach_Name + " Beach: " + "<big>" +  this.ecoli + " %</big></b><br>" +
    //"</big></b><small><i>(Beach Name: Percentage of Water Samples with High E. Coli)</i></small>";

};

//function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#1e9195",
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.5,
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = new PopupContent(feature.properties, attribute);

    //to create temporary formatting
    //popupContent.formatted = "<h2>" + popupContent.ecoli + " %</h2>";
   
    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//prop symbols to layer
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    var year = attribute.slice(9);
        //update temporal legend
        document.querySelector("span.year").innerHTML = year;

    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = new PopupContent(props, attribute);    
            //update popup with new content    
            popup = layer.getPopup();    
            popup.setContent(popupContent.formatted).update();
        };
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with e.coli values
        if (attribute.indexOf("Perc_Exc") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

//Create new sequence controls
function createSequenceControls(attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/Reverse.svg"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/Forward.svg"></button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());    // add listeners after adding control}

    //set slider attributes
    document.querySelector(".range-slider").max = 8; //index based on number of years of data
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1; //increase in one year increments

    var steps = document.querySelectorAll('.step');

    steps.forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;
            //increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //if past the last attribute, wrap around to first attribute
                index = index > 8 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 8 : index;
            };

            //update slider
            document.querySelector('.range-slider').value = index;

            //pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })
    })

    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
        //get the new index value
        var index = this.value;

        //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

//create map legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //PUT YOUR SCRIPT TO CREATE THE TEMPORAL LEGEND HERE
            container.innerHTML = '<p class="temporalLegend">Percent of Water Samples Exceeding Accepted E. coli Levels in <span class="year">2016</span></p>';

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="130px" height="100px">';
            
            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //loop to add each circle and text to svg string
            for (var i=0; i < circles.length; i++){

                //assign the radius and cy attributes
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 60 - radius;  

                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + (radius+2) + '"cy="' + cy + '" fill="#1e9195" fill-opacity="0.5" stroke="#FFFFFF" cx="27"/>';  
            
                //evenly space out labels
                var textY = i * 17 + 25;

                //add text string to legend based on min,mean,max values
                svg += '<text id="' +
                    circles[i] +
                    '-text" x="58" y="' + //set relative position of text to circles
                    textY +
                    '">' +
                    Math.round(dataStats[circles[i]] * 100) / 100 + //round stat values
                    " % " + "(" + circles[i] + ")" +
                    "</text>";
            };  

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        },
    });

    map.addControl(new LegendControl());
};

//create a popup upon load
function createInitialPopup() {
    //location and content
    var popCoords = [43,-86.25]
    var popContent = "<p><b><big><span style=font-family:'Cambria'>Welcome to the<br>Beach Health<br>Explorer</span></big></b><br /><br /><b>Click any circle</b> on the<br>map to see E. coli levels<br>at that particular beach.<br /><br /><b>Use the slider</b> below to<br>see results year-to-year.</p>"

    //add popup to map
    var initialpopup = L.popup({
        //classname: 'initialPopup'
        //couldn't figure out how to change style without changing all other popups
        //wanted to eliminate the pointer on popup
        })
        .setLatLng(popCoords)
        .setContent(popContent)

        initialpopup.openOn(map);
};

//access the beach data
function getData(map){

    fetch("data/lakeMich_beach.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
        
            calcStats(json); //call function to cal stats
            createPropSymbols(json, attributes); //call function to create proportional symbols
            createSequenceControls(attributes); //call function to create slider
            createLegend(attributes); //call function to create legend
            createInitialPopup(); //call function to make the intial popup
        })
};

//initiates map upon load

document.addEventListener('DOMContentLoaded',createMap);
