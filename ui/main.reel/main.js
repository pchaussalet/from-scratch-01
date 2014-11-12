/**
 * @module ui/main.reel
 * @requires montage/ui/component
 */
var Component = require("montage/ui/component").Component;
var request = require("montage/core/request");
var DateConverter = require("montage/core/converter/date-converter").DateConverter;

var UPDATE_FREQUENCY = 5 * 60; // Update every 10 minutes

/**
 * @class Main
 * @extends Component
 */
exports.Main = Component.specialize(/** @lends Main# */ {
    constructor: {
        value: function Main() {
            this.super();
            this.remaining = -1;
        }
    },
    
    handleGetWeathersAction: {
        value: function (event) {
            var locationsController = this.templateObjects.locationsController,
                locations = locationsController.content,
                currDate = new Date(),
                currTime = currDate.getTime(),
                dateConverter = new DateConverter();
            
            dateConverter.pattern = 'yyyy-MM-dd HH:mm';
            var self = this;
            this.remaining = UPDATE_FREQUENCY;

            locations.filter(function(x) { return x.name; }).forEach(function(location) {
                location.weather = 'updating...';
                location.icon = '';
                location.time = '';
                request('http://api.openweathermap.org/data/2.5/weather?units=metric&q=' + location.name).then(
                    function(res) {
                        var data = JSON.parse(res.body);
                        request('https://maps.googleapis.com/maps/api/timezone/json?location=' + data.coord.lat + ',' + data.coord.lon + '&timestamp=' + Math.round(currTime/1000)).then(
                            function(res2) {
                                var offset = (JSON.parse(res2.body).rawOffset/3600) + (currDate.getTimezoneOffset()/60);
                                var localizedDate = new Date(currDate.setUTCHours( currDate.getUTCHours() + offset))
                                location.time = dateConverter.convert(localizedDate);
                            },
                            function(err) {
                                console.log('An error has occured while updating time for location: ' + location.name, err);
                                location.time = 'An error has occured...';
                            }
                        );
                        location.weather = data.weather[0].description;
                        location.temp = '(' + data.main.temp + '°C)';
                        location.icon = 'http://openweathermap.org/img/w/' + data.weather[0].icon + '.png';
                    },
                    function(err) {
                        console.log('An error has occured while updating weather for location: ' + location.name, err);
                        location.weather = 'An error has occured...';
                    }
                );
                
            });
            self.interval = setInterval(function() {
                if (--self.remaining == 0) {
                    clearInterval(self.interval);
                    self.handleGetWeathersAction();
                }
            }, 1000)
        }
    }

});
