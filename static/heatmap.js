/* document.addEventListener('DOMContentLoaded', function() {
    alert("Ready!");
}, false); */

window.onload = function() {
	
	// TODO
	// 1. Add Notes - May be later
	// 2. The HeatMap
	
	// momentjs toJSON gives Greewich date, so change it to local
	// Even the new Date().toJSON gives the 5:30 deducted time
	moment.fn.toJSON = function() { return this.format(); }
	// define toggleClass fn
	// d3.selection.prototype.toggleClass = function(className) {  
    //   this.classed(className, !this.classed(className));
    //   return this;
	// }
	
	var chartData = [];
	
	var totalh = 0; 
    var totalm = 0;
    var starth = 0; 
    var startm = 0;
	
	var timer_id = 0; // for cancelling the setInterval
	var timer_set_interval = 60; // should be set to 60 for 1 minute. Set to 1 for testing purposes
	var now = moment(); // now will be upto date if timer is running, otherwise not
	var date_today = now.toJSON().substr(0,10); //2017-01-13 
	var date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // can't say today.subtract(1,'day') as today is mutable
	var start_date = date_today; // date of starth and startm
	
	var max_allowed_working_hours = 16; // You can't work more than 16 hours a day
	var careless = false; // true means the timer is running for so long, but user is not working 
	
	var alert_bottom = d3.select('#alert-bottom');
	var commit_button = d3.select('#commit-button');
	var previous_div = d3.select('#prev-div')
	var started_div = d3.select('#started-div');
	var curent_div = d3.select('#current-div');			  
	var total_div = d3.select('#total-div'); // BE_CAREFUL - HTML may change
	var date_div = d3.select('#date-div'); // .select('div'); // BE_CAREFUL - HTML may change
	var ic_play = d3.select('.play');	
	
	
	// This is timer running only for Testing
	// Simulate a clock outside
	/* d3.select('#current-time').text('Current Time: '+ now.hour() +'h'+now.minute()+'m' );
	setInterval(function(){
		  //now = moment();				  
		  now = now.add(1, 'hour');
	      // Code for Testing purposes		
		  d3.select('#current-time').text('Current Time: '+ now.hour() +'h'+now.minute()+'m' );

	}, 1000*timer_set_interval); */
	
	
	
	
	// shouldn't be repeated in playing state as well as reload of playing state
	// called from display_divs_and_set_timer() function
	function timer_ticked() {
		// comment now if testing so that we can use the gloabl now
		now = moment();
		date_today = now.toJSON().substr(0,10); //2017-01-13 
		date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // can't say today.subtract(1,'day') as today is mutable
		
		// Very Important! If time crosses 11.59PM to 00AM, do a db write of last day's work
		if (start_date !== date_today) {
			// Find out the number of hours of work in the last day
			var total_yh = totalh + 24 - starth;
			var total_ym = totalm - startm;
			
			if (total_ym < 0) {
				total_yh -= 1;
				total_ym += 60;
			}
			
			// If the timer has been running for more than 16h? Simply ignore it!
			if (start_date !== date_yesterday || (total_yh+total_ym/60 > max_allowed_working_hours)) {
				careless = true;
			}
			
			// If eligible, yesterday's work has to be written to the datastore
			if(!careless) {
				
				var xhr = new XMLHttpRequest();
				// We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
				var params = '/ajax?date='+date_yesterday+'&totalh='+total_yh+'&totalm='+total_ym;
				//console.log(params);
				xhr.open('POST', params);
				xhr.send();
				xhr.onreadystatechange = function () {
					var DONE = 4; // readyState 4 means the request is done.
					var OK = 200; // status 200 is a successful return.
					if (xhr.readyState === DONE) {
						if (xhr.status === OK) {
							 // Timer ticking ticking leaped to the next day!
							 // Alert that the work is committed
						     var message = "Yesterday's Work of " + total_yh + "h " + total_ym + "m Committed Successfully!";
						     show_alert.call(alert_bottom, message, "alert-success");


						}
						else {
							// started_div.style('color', 'red').text("Server Error - Yesterday's work was not committed!");
							var message = 'Work of Yesterday was NOT committed completely because of server error!';
						    show_alert.call(alert_bottom, message, "alert-danger");
						}

					}
				};
				
			}
			
			// After committing yesterday's work, reset all variables to today
			// Even if the user was careless yesterday, after ignoring that work, we have to reset the variables
			start_date = date_today;
			starth = 0; // We are restarting at 12.00AM which is 00
			startm = 0;
			totalh = 0;
			totalm = 0;
				
		} // End of yesterday
		
		// If start_date is today and it has been running for so long (>16h) , we will not do anything about it here!
		// But when paused, we will discard it
		
		
		started_div.text('Started at ' + (starth>12?starth-12:starth) + ':'+(startm<10?'0'+startm:startm.toString())+(starth>12?'PM':'AM' ));
		
		curent_div.text('Current Session: ' + format_time_diff((now.hour()-starth), (now.minute()-startm)));

	    total_div.text('Total Today: ' + format_time_diff( totalh+now.hour()-starth, totalm+now.minute()-startm ));
		
		previous_div.text('Before the Current Session: ' + format_time_diff(totalh, totalm) );
		
		date_div.text('Date: ' + format_date(date_today));
		
	}
	
	// Common things like setting current streak, total today etc.	
	function display_divs_and_set_timer() {
		// It will be wise to stop any existing timers if running coz like double click on play button etc.
		clearInterval(timer_id);
		// Call the inner function once before timer ticks 1 minute
		timer_ticked();
		
	    timer_id = setInterval(function(){
		  
			timer_ticked();

	    }, 1000*timer_set_interval);	    
				  
	};
	
	
	// Send an AJAX GET request for the state of the timer
	var xhr = new XMLHttpRequest();
	var params = '/ajax';
	xhr.open('GET', params);
	xhr.send();
	// console.log('Sent work AJAX');
	// Ajax Get request for initial timer data load
	xhr.onreadystatechange = function () {
		var DONE = 4; // readyState 4 means the request is done.
		var OK = 200; // status 200 is a successful return.
		if (xhr.readyState === DONE) {
		  if (xhr.status === OK) {
			  //console.log(xhr.responseText)
			  var response = JSON.parse(xhr.responseText);
		
			  var start_date = response.date;
			  // date_today = now.toJSON.substr(0,10); - not needed as they are already set. Look above
			  // But if the start date is yesterday,
			  // If it has been playing, cut it off till 24.00, commit it and start playing from 00AM
			  // If it was already paused, make sure totalh and totalm are both 0
			  starth = response.starth;
			  startm = response.startm;
			  totalh = response.totalh;
			  totalm = response.totalm;
			  
			  // if previous state was not playing or if it was playing but started two days back then we will set as paused
			  // Even if started yesterday, if yesterday's work > 16h, we ignore it and set as paused.
			  // bool variable
			  var started_yesterday = (start_date === date_yesterday) && ((totalh + totalm/60 + 24-starth-(startm/60)) <= max_allowed_working_hours);
			  // Even if started today, if has been playing for more than 16 hours, ignore it
			  var started_today = (start_date === date_today) && ((totalh + totalm/60 + now.hour()-starth + ((now.minute()-startm)/60)) <= max_allowed_working_hours);
			  
			  var continue_play = response.active && (started_today || started_yesterday);
			  
			  // Playing
			  if (continue_play) {		      
				  // Change icon to pause
		  	  	  ic_play.attr('class', 'play active');					  
			      // The crossing of dates will be taken cared in timer_ticked function
			      display_divs_and_set_timer();		
				  
				  // Alert that the work is Continued
				  var message = "Continued playing from the last start time";
				  show_alert.call(alert_bottom, message, "alert-info");
				 
			  }
			  
			  // Paused
			  else {
				  // no need to change the play icon
				  // But in case, the user clicks on the play button before initial ajax response, reset it.
				  ic_play.attr('class', 'play');
				  // It will be wise to stop any existing timers if running, like the play was clicked before initial ajax load
				  clearInterval(timer_id);
				  // Only consider total work of today. Not someday's before
				  // If first time access and work doesn't exist in server, start_date field will be null
				  // Also if total refers to yesterday's, set it to 0
				  if (start_date !== date_today) {
					  
					  totalh = 0;
					  totalm = 0;
				  }
				  
				  started_div.text('Click to Start');
				  
				  curent_div.text('Current Session: --:--')
				  
				  previous_div.text('Before the Current Session: ' + format_time_diff(totalh, totalm) );
				  
				  total_div.text('Total Today: ' + format_time_diff(totalh, totalm) );
				  
				  date_div.text('Date: ' + format_date(date_today));
			  }
			
			  
		  }
		  else {
			  started_div.style('color', 'red').text('Server Error! Please Refresh Page');
			  var message = "Failed to load data";
			  show_alert.call(alert_bottom, message, "alert-warning");
		  }

		}
	  };	// End of Ajax GET request  
	
	
	ic_play.on('click', function() {
      //ic_play.toggleClass('active');
	  // The following 3 lines are probably not super important as we update these in timer tick every minute
	  now = moment();
	  date_today = now.toJSON().substr(0,10); //2017-01-13 
	  date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // now is mutable
	
	  // clicked to pause. Set icon as play
	  if (ic_play.classed('active')) {
		  
		  //ic_play.attr('class', 'play');
		  ic_play.classed('active', false);
		  
		  // clear any existing time intervals
		  clearInterval(timer_id);
		  
		  // Paused/Stopped. So compute the totalh and totalm now!
		  totalh = totalh + now.hour() - starth;
		  totalm = totalm + now.minute() - startm;
		  
		  // Avoid negative in totalm
		  if (totalm < 0) {
			  totalm += 60;
			  totalh -= 1;
		  }
		  // Also avoid minute >= 60
		  if (totalm >= 60) {
			  totalm -= 60;
			  totalh += 1;
		  }
		  
		  // Sumit automatically when paused itself
		  // But do only so if the person is not careless. i.e. timer is not running continuously for so long
		  // It could be that today is continuation of yesterday's careless (>16h) session, so don't write today's as well
		  if (totalh + totalm/60 > max_allowed_working_hours)
			  careless = true; // careless could be already true from timer_ticked()
		  	  
		  if (careless) {
			  totalh = 0;
			  totalm = 0;
		  }
		  // Only commit if valid work
		  else {
		      // Ajax Post request for PAUSE
			  // We immediately write to the datastore when paused
			  var xhr = new XMLHttpRequest();
			  // We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
		  	  var params = '/?date='+date_today+'&active='+0+'&totalh='+totalh+'&totalm='+totalm+'&starth='+0+'&startm='+0;
		  	  //console.log(params);
			  xhr.open('POST', params);
			  xhr.send();

			  xhr.onreadystatechange = function () {
					var DONE = 4; // readyState 4 means the request is done.
					var OK = 200; // status 200 is a successful return.
					if (xhr.readyState === DONE) {
					  if (xhr.status === OK) {
						  // var response = JSON.parse(xhr.responseText); // no response from server
						  var ugly = 0; // some unexplainable error in modifying the chartData
						  // Re-render the calendar heatmap
						  var temp = {
								  date: now.toDate(),
								  count: totalh + totalm/60,
								  hours: totalh,
								  mins: totalm
						  };
						  
						  // Change the chartData. Only last element needs to be checked
						  var last_date = chartData[chartData.length-1].date.toString().substr(0,15); // "Fri Feb 03 2017"
						  if (last_date === now.clone().toString().substr(0,15) ) {
							  chartData[chartData.length-1] = temp;
						  }
						  // check if last element is yesterday, then append a new element
						  else if (last_date === now.clone().subtract(1, 'day').toString().substr(0,15) ) {
							  console.log('tomorrow')
							  chartData.push(temp);
						  }
						  else { // something went ugly!
								var message = 'Work of ' + totalh + 'h ' + totalm + 'm Committed Successfully! But Calendar Data is not updated correctly';
						  		show_alert.call(alert_bottom, message, "alert-warning");  
							  
							    ugly = 1;
						  }
						  var heatmap = calendarHeatmap()
								  .data(chartData)
								  .selector('#calendar-viz')
								  .tooltipEnabled(true)
								  // .legendEnabled(false)
								  // .colorRange(['#eee', '#459b2a'])
								  .onClick(function (data) {
									console.log('data', data);
						  });
						  // Re-render the calendar heatmap
						  heatmap();
						  
						  
						  // Alert that the work is committed only if alert is not shown already
						  if (!ugly) {
							  var message = 'Work of ' + totalh + 'h ' + totalm + 'm Committed Successfully!';
							  show_alert.call(alert_bottom, message, "alert-success");
						  }
						
					  }
					  else {
						  // started_div.style('color', 'red').text('Server Error!');
						  // Alert that the commit failed
						  var message = 'Last commit failed!';
						  show_alert.call(alert_bottom, message, "alert-danger");
					  }

					}
			  };	
		  
		  }
		  
		  // We are not changing the text inside the button as of now!
		  // Show the commit button
		  //commit_button.text('Commit');
		  // commit_button.attr('disabled', null);
		  
		  // Show the edit total streak option
		  d3.select('#total-edit-button').classed('disabled', false);
		  
	  } 
		
	  // clicked to play. Change icon to pause	
	  else {
		  
		  //ic_play.attr('class', 'play active');
		  ic_play.classed('active', true);
		  
		  careless = false; // Once user starts playing, they are no more careless
		  
		  // Make sure the editland is disabled when playing
		  d3.select('#area-editland').classed('disabled', true);
		  d3.select('#area-viewland').classed('disabled', false);
		  
		  
		  // hide the edit total streak option
		  d3.select('#total-edit-button').classed('disabled', true);
		  			//.attr('class', 'disabled');
		  
		  // We have to make sure that totalh is 0 if played on a new day!
		  // totalh and totalm may persist from the previous day
		  if(start_date !== date_today) {
			  totalh = 0;
			  totalm = 0;
			  // Also once played, consider that as a page load with fresh values for variables
			  start_date = date_today;
		  }
		 
		  // Moved the starting from inside of ajax success to outside of ajax request
		  // so as to start the timer immediately without waiting for response
		  // Cancel the play state if ajax fails!
		  starth = now.hour(); //response.starth; // duplicate of nowh - but ok!
		  startm = now.minute();//response.startm; // duplicate of nowm - but ok! we may change nowm
		  // Set the display
		  // Set all the divs: started-div, current-div, total-div and prev-div
		  display_divs_and_set_timer();

		  // Ajax post request to set the start time and active status
		  var xhr = new XMLHttpRequest();
		  // we send total time as well which will be available when the page is loaded
		  var params = '/?date='+date_today+'&active='+1+'&starth='+now.hour()+'&startm='+now.minute()+'&totalh='+totalh+'&totalm='+totalm;
		  //console.log(params);
		  xhr.open('POST', params);
		  xhr.send();
		  
		  xhr.onreadystatechange = function () {
				var DONE = 4; // readyState 4 means the request is done.
				var OK = 200; // status 200 is a successful return.
				if (xhr.readyState === DONE) {
				  if (xhr.status === OK) {
					  // No response from server for POST
					  // console.log('success');
					  // console.log(ic_play.classed('active'));
					  
				  }
				  else {
					d3.select('#started-div').style('color', 'red').text('Server Error! Please Retry');
					  
					// Reset to paused state
					//ic_play.attr('class', 'play');
					ic_play.classed('active', false);
					// stop timer
					clearInterval(timer_id);
				  }
					
				}
		  }; // End of Ajax POST
	  } // end of else
		
      return false;
     }); // end of ic_play on click
	
	 
	 // Edit button event handler
	 // This need not be inside the paused event handler
	 d3.select('#total-edit-button').on('click', function() {
		 // Just disable area-viewland
		 d3.select('#area-viewland').classed('disabled', true);
		 // enable the area-editland
		 d3.select('#area-editland').classed('disabled', false);
		 
		 // Need to set the totalh and totalm in the dropdown
		 var element_h = document.getElementById('sel-hour');
		 var element_m = document.getElementById('sel-mins');
		 var element_d = document.getElementById('datepicker');
		 element_h.value = totalh;
		 element_m.value = totalm;
		 // Set the date as date_today
		 element_d.value = format_date(date_today);
		 // If we don't keep the date in original format, we will have to reformat it back
		 element_d.original = date_today;
		 
		 // totalm maynot be a multiple of 5, then no option will be selected in the select-mins
		 if (totalm % 5 !== 0) {
			 var r = totalm % 5;
			 element_m.value = totalm - r;
		 }
		 
		 
		 
	 }); // end of edit-button on-click
	
	  
	  // When commit button is clicked
	  commit_button.on('click', function() {
		  // Read the totalh and totalm from the dropdown
		  // Remember these are strings
		  var h = parseInt(document.getElementById('sel-hour').value, 10);
		  var m = parseInt(document.getElementById('sel-mins').value, 10);
		  // original is in toJSON().substr format while value is formatted as 1-Jan-2017
		  var d = document.getElementById('datepicker').original; 

		  // change the editview to viewland once edit is submitted
		  d3.select('#area-editland').classed('disabled', true);
		  d3.select('#area-viewland').classed('disabled', false);
		  started_div.text('Click to Start');

		  // Need to check the date for the appropriate type of write
		  // If yesterday or someday before we have to use the handler /ajax
		  // If not today don't change the totalh and totalm as well
		  
		  // Ajax Post request
		  var xhr = new XMLHttpRequest();
		  // We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
		  var params = '/?date='+date_today+'&active='+0+'&totalh='+h+'&totalm='+m+'&starth='+0+'&startm='+0;
		  // If date is someday back, use the handler /ajax as we shouldn't change the Work today
		  if (d !== date_today) {
			  params = '/ajax?date='+d+'&active='+0+'&totalh='+h+'&totalm='+m+'&starth='+0+'&startm='+0;
		  }
		  // If same day, update the total
		  else {
			  totalh = h;
			  totalm = m;
			  // Change the display of total
			  total_div.text('Total Today: ' + format_time_diff(totalh, totalm) );
		  }
		  //console.log(params);
		  xhr.open('POST', params);
		  xhr.send();
		  xhr.onreadystatechange = function () {
				var DONE = 4; // readyState 4 means the request is done.
				var OK = 200; // status 200 is a successful return.
				if (xhr.readyState === DONE) {
				  if (xhr.status === OK) {
					  // var response = JSON.parse(xhr.responseText); // no response from server
					  // Re-render the calendar heatmap
					  var edited_date = moment(d).toDate()
					  // moment(d).toDate() seems dangerous to use, as its toJSON() gives yesterday
					  // But it turns out that dateElement is in the format (00:00 +5:30GMT) same as the above.
					  // Initially I thought of new Date(d) which gives 5:30 +5:30GMT
					  var temp = {
							  date: edited_date,
							  count: h + m/60,
							  hours: h,
							  mins: m
					  };
					  
					  // What if the first commit on today is an edit? We have to append temp to the chartData
					  // BUT for the time being - not doing it! In stead expect user to refresh the page!
					  
					  // Change the chartData if edited date is there. Only the appropriate element needs to be changed.
					  var index = chartData.length - 1; // looping backward is better as it's more likely to edit nearby dates
					  for(var i=index; i>=0; i--) {
					  	 var ele = chartData[i];
						 if (ele.date.toString().substr(0,15) === edited_date.toString().substr(0,15)) {
							 chartData[i] = temp;
							 break;
						 }
					  }
					 
					  var heatmap = calendarHeatmap()
							  .data(chartData)
							  .selector('#calendar-viz')
							  .tooltipEnabled(true)
							  // .legendEnabled(false)
							  // .colorRange(['#eee', '#459b2a'])
							  .onClick(function (data) {
								console.log('data', data);
					  });
					  // Re-render the calendar heatmap
					  heatmap();
					  
					  
					  var message = "Work of " + h + 'h ' + m + 'm committed successfully!' ;
				      show_alert.call(alert_bottom, message, "alert-success");


				  }
				  else {
					  // started_div.style('color', 'red').text('Server Error! Please Retry');
					  var message = "Failed to commit the last edit";
				  	  show_alert.call(alert_bottom, message, "alert-danger");
				  }

				}
		  };	  

	  }); // end of commit button submit	
	

      // Enable the pikaday date picker	
	  // Can pick upto today, not future dates
	  var picker = new Pikaday({ 
		  	field: document.getElementById('datepicker'),
		    maxDate: new Date(),
		    onSelect: function() {
				var dp = document.getElementById('datepicker');
				dp.original = dp.value;
				dp.value = format_date(dp.value);
			}
	  });

	  // Activate the alerts adapted from d3-bootstrap
	  // Basically we are only activating the onclick event listener for close
	  d3.selectAll("div.alert").call(bootstrap.alert());
	
	  
	
	  // Retrieve 1 year worth of entry data
	  var edate = moment().endOf('day').toJSON().substr(0,10);
	  var sdate = moment().startOf('day').subtract(1, 'year').toJSON().substr(0,10);
	  
	  // Why this Ajax request inside onLoad? Because we access the #calendar-viz
	  var xhr = new XMLHttpRequest();
	  var params = '/data?sdate=' + sdate + '&edate=' + edate;
	  xhr.open('GET', params);
	  xhr.send();
	  // console.log('Sent entry AJAX');
	  xhr.onreadystatechange = function () {
			var DONE = 4; // readyState 4 means the request is done.
			var OK = 200; // status 200 is a successful return.
			if (xhr.readyState === DONE) {
			  if (xhr.status === OK) {
				  // Successfully retrieved 1 year worth of data
				  // response is a dictionary with keys as date strings
				  var response = JSON.parse(xhr.responseText);
				  data = response;
				  // var start_date = response.date;  
				  
				  var today_end = moment().endOf('day').toDate(); // similar to new Date() 
	  			  var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
				  
				  // Set up the data
				  chartData = d3.time.days(yearAgo, today_end).map(function (dateElement) {
					// If date is not in the response from server, set count as 0
					var count = 0;  
					var hours = 0;
					var mins = 0;
					// directly taking dateElement toJSON subtracts 5:30 hours, so date may be yesterday
					//  console.log(new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toJSON());
					var d = moment(dateElement).toJSON().substr(0,10);			
					if (response[d]) {
						// console.log(response[d].hours)
						hours = parseInt(response[d].hours, 10);
						mins = parseInt(response[d].mins, 10);
						count = hours + mins/60; // 1h 30m is 1.5 count
					}
					  
					// dateElement is similar to the object you get by new Date()
					return {
					  date: dateElement,//.toJSON().substr(0,10),
					  count: count,//(dateElement.getDay() !== 0 && dateElement.getDay() !== 6) ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 10)
					  hours: hours,
					  mins: mins
					};
				  });
				  
				  // First rendering of the calendar heatmap
				  var heatmap = calendarHeatmap()
					  .data(chartData)
					  .selector('#calendar-viz')
					  .tooltipEnabled(true)
					  // .legendEnabled(false)
					  // .colorRange(['#eee', '#459b2a'])
					  .onClick(function (data) {
						console.log('data', data);
					  });
				  
				  heatmap();  // render the chart

			  }
			  else {
				  var message = "Failed to fetch the calendar heatmap data. Please Refresh the page";
				  show_alert.call(alert_bottom, message, "alert-danger");
			  }
				
			}
	  };	// End of Ajax request for 1 year worth of entry data  
	  

} // End window.onload

// 1h-45m should be formatted as 15m
function format_time_diff(h, m) {
	if (m < 0) {
		m += 60;
		h -= 1;
	}
	
	if (m >= 60) {
		h += 1;
		m -= 60;
	}
	return (h>0 ? h+'h ' : '') + (m>0 ? m+'m' : '');
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


// Format date as Jan-27-2017
function format_date(date_string) {
	// date_string 2017-01-29
	var year = parseInt(date_string.substr(0, 4), 10);
	var month = parseInt(date_string.substr(5,2), 10);
	var day = parseInt(date_string.substr(8,2), 10);
	
	out_string = day + '-' + months[month-1] + '-' + year;
	return out_string;
}



// calendar code
// adapted from https://github.com/DKirwan/calendar-heatmap
function calendarHeatmap() {
  // defaults
  var width = 720;
  var height = 110;
  var legendWidth = 150;
  // var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var selector = 'body';
  var SQUARE_LENGTH = 11;
  var SQUARE_PADDING = 2;
  var MONTH_LABEL_PADDING = 6;
  var now = moment().endOf('day').toDate();
  var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
  var data = [];
  var colorRange = ['#D8E6E7', '#218380'];
  var tooltipEnabled = true;
  var tooltipUnit = 'work'; //'contribution';
  var legendEnabled = true;
  var onClick = null;
  var weekStart = 0; //0 for Sunday, 1 for Monday

  // setters and getters
  chart.data = function (value) {
    if (!arguments.length) { return data; }
    data = value;
    return chart;
  };

  chart.selector = function (value) {
    if (!arguments.length) { return selector; }
    selector = value;
    return chart;
  };

  chart.colorRange = function (value) {
    if (!arguments.length) { return colorRange; }
    colorRange = value;
    return chart;
  };

  chart.tooltipEnabled = function (value) {
    if (!arguments.length) { return tooltipEnabled; }
    tooltipEnabled = value;
    return chart;
  };

  chart.tooltipUnit = function (value) {
    if (!arguments.length) { return tooltipUnit; }
    tooltipUnit = value;
    return chart;
  };

  chart.legendEnabled = function (value) {
    if (!arguments.length) { return legendEnabled; }
    legendEnabled = value;
    return chart;
  };

  chart.onClick = function (value) {
    if (!arguments.length) { return onClick(); }
    onClick = value;
    return chart;
  };

  function chart() {

    d3.select(chart.selector()).selectAll('svg.calendar-heatmap').remove(); // remove the existing chart, if it exists

    var dateRange = d3.time.days(yearAgo, now); // generates an array of date objects within the specified range
    var monthRange = d3.time.months(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month
    var firstDate = moment(dateRange[0]);
    // max hours is assumed to be 12. But it's not very important
	var max = 12; // d3.max(chart.data(), function (d) { return d.count; }); // max data value

    // color range
    // var color = d3.scale.linear()
    //   .range(chart.colorRange())
    //   .domain([0, max]);
	// a quantize scale split the domain into equal n parts where n is the number of elements in the range
	/* var color = d3.scale.quantile()
		  .domain([0, 3, 6, 9]) // domain will be split into 4 equal parts 0-3, 3-6, 6-9 and 9-12
		  .range(['#eeeeee', '#d6e685', '#8cc665', '#44a340', '#1e6823'])
	*/
	  // TODO - convert this into a d3.scale.myScale() function
	  var color = function(color) {
		  if (color <= 0) 
			  return '#eeeeee';
		  if (color < 3)
			  return '#d6e685';
		  if (color < 6)
			  return '#8cc665';
		  if (color < 9)
			  return '#44a340';
		  else
			  return '#1e6823';
	  }
	
    var tooltip;
    var dayRects;

    drawChart();

    function drawChart() {
      var svg = d3.select(chart.selector())
        .append('svg')
        .attr('width', width)
        .attr('class', 'calendar-heatmap')
        .attr('height', height)
        .style('padding', '36px');

      dayRects = svg.selectAll('.day-cell')
	    .data(data)

      dayRects.enter().append('rect')
        .attr('class', 'day-cell')
        .attr('width', SQUARE_LENGTH)
        .attr('height', SQUARE_LENGTH)
	    .attr('fill', function(d) { return color(d.count); })
        .attr('x', function (d, i) {
          var cellDate = moment(d.date);
          var result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
          return result * (SQUARE_LENGTH + SQUARE_PADDING);
        })
        .attr('y', function (d, i) {
          return MONTH_LABEL_PADDING + formatWeekday(d.date.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
        });

      if (typeof onClick === 'function') {
        dayRects.on('click', function (d) {
          onClick(d);
        });
      }

      if (chart.tooltipEnabled()) {
        dayRects.on('mouseover', function (d, i) {
          tooltip = d3.select(chart.selector())
            .append('div')
            .attr('class', 'day-cell-tooltip')
            .html(tooltipHTMLForDate(d))
            .style('left', function () { return Math.floor(i / 7) * SQUARE_LENGTH + 'px'; })
            .style('top', function () {
              return formatWeekday(d.date.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 1 + 'px';
            });
        })
        .on('mouseout', function (d, i) {
          tooltip.remove();
        });
      }

      if (chart.legendEnabled()) {
        var colorRange = [color(0)];
        for (var i = 3; i >= 0; i--) {
		  var step = max/4; // 3 is the step size
          colorRange.push(color(max - step * i - 0.1)); // max is 12 // -0.1 is used because color(3) != color(2.9)
        }
		
		var legend_offset = 16;
		  
        var legendGroup = svg.append('g');
        legendGroup.selectAll('.calendar-heatmap-legend')
            .data(colorRange)
            .enter()
          .append('rect')
            .attr('class', 'calendar-heatmap-legend')
            .attr('width', SQUARE_LENGTH)
            .attr('height', SQUARE_LENGTH)
            .attr('x', function (d, i) { return (width - legendWidth) + (i + 1) * 13 + legend_offset; })
            .attr('y', height + SQUARE_PADDING)
            .attr('fill', function (d) { return d; });

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text')
          .attr('x', width - legendWidth - 13 + legend_offset)
          .attr('y', height + SQUARE_LENGTH)
          .text('Less');

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text')
          .attr('x', (width - legendWidth + SQUARE_PADDING) + (colorRange.length + 1) * 13 + legend_offset)
          .attr('y', height + SQUARE_LENGTH)
          .text('More');
      }

      dayRects.exit().remove();
		
	  // Setting up the Feb Mar Apr etc. Legends on the top of the calendar	
      var monthLabels = svg.selectAll('.month')
          .data(monthRange)
          .enter().append('text')
          .attr('class', 'month-name')
          .style()
          .text(function (d) {
            return months[d.getMonth()];
          })
          .attr('x', function (d, i) {
            var matchIndex = 0;
            dateRange.find(function (element, index) {
              matchIndex = index;
              return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
            });

            return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING);
          })
          .attr('y', 0);  // fix these to the top

      days.forEach(function (day, index) {
        index = formatWeekday(index);
		// Mon Wed Fri - not all days are displayed on the left legend
        if (index % 2) {
          svg.append('text')
            .attr('class', 'day-initial')
            .attr('transform', 'translate(-8,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
            .style('text-anchor', 'middle')
            .attr('dy', '2')
            .text(day);
        }
      });
    }

    function tooltipHTMLForDate(d) {
      var dateStr = moment(d.date).format('ddd, MMM Do YYYY');
      var tooltip = '<span><strong>' + (d.count ? format_time_diff(d.hours, d.mins) : 'No Work') + '</strong> on ' + dateStr + '</span>';
	  return tooltip;
    }

    function formatWeekday(weekDay) {
      if (weekStart === 1) {
        if (weekDay === 0) {
          return 6;
        } else {
          return weekDay - 1;
        }
      }
      return weekDay;
    }

    var daysOfChart = chart.data().map(function (day) {
      return day.date.toDateString();
    });

    dayRects.filter(function (d) {
      return daysOfChart.indexOf(d.date.toDateString()) > -1;
    }).attr('fill', function (d, i) {
      return color(chart.data()[i].count);
    });
  }

  return chart;
}


// polyfill for Array.find() method
/* jshint ignore:start */
if (!Array.prototype.find) {
  Array.prototype.find = function (predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}



// Alerts from d3-bootstrap github
(function(exports) {

  var bootstrap = (typeof exports.bootstrap === "object")
    ? exports.bootstrap
    : (exports.bootstrap = {});

  var dismiss = '[data-dismiss="alert"]';

  bootstrap.alert = function() {
	//console.log('alert set');
    var alert = function(selection) {
      selection.select(dismiss)
        .on("click", close);
    };

	// Seems not required  
    /* alert.close = function(selection) {
      selection.each(close);
    }; */

	// Basically remove in .in class to hide the alert box  
    function close() {	
	  // sel is the close button
      sel = d3.select(this);
		
      if (d3.event) 
		  d3.event.preventDefault();

      target = sel.classed("alert") ? sel : d3.select(sel.node().parentNode);

      // TODO trigger?
      target.classed("in", false);
      if (target.classed("fade")) {
        // TODO prefixed events?
        target.on("transitionEnd", function() {
          target.remove();
        });
      } else {
        target.remove();
      }
    }

    return alert;
  };

  // TODO automatic delegation of alert closing?

})(this);


// this refers to alert_bottom
function show_alert(message, alert_type) {
	// alert_type can be "alert-success", "alert-danger" etc.
	this.select('div').text(message);
	var class_list = "alert fade " + alert_type;
	// this.classed('in', true);
	this.attr('class', class_list + " in");
	
	// Hide the alert automatically after 5s
	var that = this;
	setTimeout(function() {
		// Remove .in class
		that.attr('class', class_list);
	}, 5000);
}