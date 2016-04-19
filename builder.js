$.noConflict();
jQuery( document ).ready(function( $ ) {

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

var QueryString = function () {
  // This function is anonymous, is executed immediately and 
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
        // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
        // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
      query_string[pair[0]] = arr;
        // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  } 
    return query_string;
}();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var defaultColors = [
  '#113F8C',
  '#01A4A4',
  '#00A1CB',
  '#61AE24',
  '#D0D102',
  '#32742C',
  '#D70060',
  '#E54028',
  '#F18D05'
];

var channel = QueryString.channel || 'test-channel-' + Math.random();
var subscribe_key = QueryString.subscribe_key || 'sub-c-bd9ab0d6-6e02-11e5-8d3b-0619f8945a4f';

var builder = function(params) {

  var self = this;

  self.cols = [];
  self.labels = {};
  self.colors = {};

  self.refresh = function(params) {

    var params = params || {};

    self.type = params.type || self.type || 'spline';
    self.limit = params.limit || self.limit || 5;
    self.xlabel = params.xlabel || self.xlabel || '';
    self.ylabel = params.ylabel || self.ylabel || '';

    self.rate = params.rate || self.rate || 1000;
    self.duration = params.duration || self.duration || 250;

    if(typeof self.history == "undefined") {
      self.history = false;
    }

    if(typeof params.history !== "undefined") {
      self.history = params.history;
    }

    if(typeof self.xgrid == "undefined") {
      self.xgrid = false;
    }

    if(typeof params.xgrid !== "undefined") {
      self.xgrid = params.xgrid;
    }

    if(typeof self.ygrid == "undefined") {
      self.ygrid = false;
    }

    if(typeof params.ygrid !== "undefined") {
      self.ygrid = params.ygrid;
    }

    if(typeof self.points == "undefined") {
      self.points = true;
    }

    if(typeof params.points !== "undefined") {
      self.points = params.points;
    }

    if(typeof self.tooltips == "undefined") {
      self.tooltips = true;
    }

    if(typeof params.tooltips !== "undefined") {
      self.tooltips = params.tooltips;
    }

    self.flow = false;

    if(self.type == "spline" ||
      self.type == "line" ||
      self.type == "area" ||
      self.type == "area-spline" ||
      self.type == "step" ||
      self.type == "area-step" ||
      self.type == "scatter" ||
      self.type == "bar") {

      self.flow = true;

      $('#limit-row, #points-row, #xgrid-row, #ygrid-row').show();

    } else {
      $('#limit-row, #points-row, #xgrid-row, #ygrid-row').hide();
    }

    // self.chart.load({unload: true});

    self.chart = eon.chart({
      pubnub: self.pubnub,
      channel: channel,
      history: self.history,
      flow: self.flow,
      rate: self.rate,
      limit: self.limit,
      debug: false,
      generate: {
        bindto: '#chart',
        data: {
          x: self.x,
          type: self.type,
          colors: self.colors
        },
        transition: {
          duration: self.duration
        },
        axis: {
          x: {
            label: self.xlabel,
          },
          y: {
            label: self.ylabel
          }
        },
        grid: {
          x: {
            show: self.xgrid
          },
          y: {
            show: self.ygrid
          }
        },
        tooltip: {
          show: self.tooltips
        },
        point: {
          show: self.points
        }
      },
      transform: function(message) {

        var message = eon.c.flatten(message.eon);
        var o = {};

        for(index in message) {
          if(self.cols.indexOf(index) > -1){
            o[self.labels[index] || index] = message[index]; 
          }
        }

        return {
          eon: o
        };

      }
    });

    self.pedit.subscribe({
      channel: channel,
      message: function(data, a, b) {

        var data = eon.c.flatten(data.eon);

        for(var key in data) {

          var $row = $('[data-key="' + key + '"]');
          var value = data[key];

          if(!isNaN(value)) {

            if($row.length) {

              $row.find('.val').text(value)

            } else {

              self.cols.push(key);

              var color = defaultColors[$('tr').length % defaultColors.length];

              var $row = $('\
                <tr data-key="' + key + '"> \
                  <td class="key"><a href="#" id="key-edit" data-type="text" data-title="Enter new key.">' + key + '</a></td> \
                  <td class="val col-md-4">' + value + '</td> \
                  <td class="col-md-4"> \
                    <dciv class="input-group colorpick" data-key="' + key + '"> \
                        <input type="text" value="' + color + '" class="form-control" /> \
                        <span class="input-group-addon"><i></i></span> \
                    </div> \
                  </td> \
                  <td> \
                  <input type="checkbox" class="toggle" checked data-toggle="toggle"> \
                  </td> \
                </tr>');

              var picker = $row.find('.colorpick').colorpicker();

              self.colors[key] = color;
              picker.on('changeColor.colorpicker', function(event){
                
                self.colors[$(this).closest('tr').attr('data-key')] = event.color.toHex();
                self.embed();

              });

              $row.find('#key-edit').editable({
                  unsavedclass: null,
                  success: function(response, newValue) {
                    
                    var thisKey = $(this).closest('tr').attr('data-key');
                    
                    self.labels[thisKey] = newValue;

                    // colors map to labels in c3
                    self.colors[newValue] = self.colors[thisKey];
                    delete self.colors[thisKey];

                    self.refresh();

                  }
              });

              $row.find('.toggle').bootstrapToggle('on');

              $row.find('.toggle').change(function() {
                
                var thisKey = $(this).closest('tr').attr('data-key');
                var isChecked = $(this).prop('checked');

                if(typeof (isChecked) !== "undefined") {

                  if(isChecked){

                    self.cols.push(thisKey);
                    self.embed();

                  } else {

                    for(var i in self.cols) {

                      if(self.cols[i] == thisKey) {
                        self.cols.splice(i, 1);
                        self.refresh();
                      }

                    }
                     
                  }
                   
                }

              });

              $('#kvs').append($row);
              self.embed();

            }

          }

        }

      }
    });

    self.embed();

  }

  self.embed = function() {

    var embedsrc = '' +
      '<script type="text/javascript" src="http://pubnub.github.io/eon/v/eon/0.0.10/eon.js"><\/script>\n' +
      '<link type="text/css" rel="stylesheet" href="http://pubnub.github.io/eon/v/eon/0.0.10/eon.css" />\n' +
      '<div id="chart"></div>\n' + 
      '<script type="text/javascript">\n' +
      'var __eon_pubnub = PUBNUB.init({\n' +
      '  subscribe_key: "' + subscribe_key + '"\n' +
      '});\n' +
      'var __eon_cols = ' + JSON.stringify(self.cols) + '; \n' +
      'var __eon_labels = ' + JSON.stringify(self.labels) + '; \n' + 
      'chart = eon.chart({\n' +
      '  pubnub: __eon_pubnub,\n' +
      '  channel: "' + channel + '",\n' +
      '  history: ' + self.history + ',\n' +
      '  flow: ' + self.flow +',\n' +
      '  rate: ' + self.rate + ',\n' +
      '  limit: ' + self.limit + ',\n' +
      '  generate: {\n' +
      '    bindto: "#chart",\n' +
      '    data: {\n' +
      '      colors: ' + JSON.stringify(self.colors) + ',\n' + 
      '      type: "' + self.type + '"\n' +
      '    },\n' +
      '    transition: {\n' +
      '      duration: ' + self.duration + '\n' +
      '    },\n' +
      '    axis: {\n' +
      '      x: {\n' +
      '        label: "' + self.xlabel + '"\n' +
      '      },\n' +
      '      y: {\n' +
      '        label: "' + self.ylabel + '"\n' +
      '      }\n' +
      '    },\n' +
      '    grid: {\n' +
      '      x: {\n' +
      '        show: ' + self.xgrid + ' \n' +
      '      },\n' +
      '      y: {\n' +
      '        show: ' + self.ygrid + ' \n' +
      '      }\n' +
      '    },\n' +
      '    tooltip: {\n' +
      '     show: ' + self.tooltips + '\n' +
      '    },\n' +
      '    point: {\n' +
      '      show: ' + self.points + '\n' +
      '    }\n' +
      '  },\n' +
      '  transform: function(message) {\n' +
      '    var message = eon.c.flatten(message.eon);\n' +
      '    var o = {};\n' +
      '    for(index in message) {\n' +
      '      if(__eon_cols.indexOf(index) > -1){\n' +
      '        o[__eon_labels[index] || index] = message[index];\n' +
      '      }\n' +
      '    }\n' +
      '    return {\n' +
      '      eon: o\n' +
      '    };\n' +
      '  }\n' + 
      '});\n' +
      '<\/script>';

      $('#embed').text(embedsrc);

  };

  self.pubnub = PUBNUB.init({
    ssl: location.protocol === "https:",
    subscribe_key: subscribe_key
  });

  self.pedit = PUBNUB.init({
    ssl: location.protocol === "https:",
    subscribe_key: subscribe_key
  });

  self.refresh(params);

  return self;

};

var pnTester = PUBNUB.init({
  publish_key: 'pub-c-923938f1-a4c1-4253-b15a-9c24087904c9',
  subscribe_key: 'sub-c-bd9ab0d6-6e02-11e5-8d3b-0619f8945a4f',
  ssl: location.protocol === "https:"
});

setInterval(function(){

  pnTester.publish({
    channel: channel,
    message: {
      eon: {
        'Austin': Math.floor(Math.random() * 99),
        'New York': Math.floor(Math.random() * 99),
        'San Francisco': Math.floor(Math.random() * 99),
        'Portland': Math.floor(Math.random() * 99)
      }
    }
  });

}, 1000);

var b;

var reboot = function(params) {
  b.unload();    
  delete b;
  b = new builder(params);
}

$('.channel').text(channel);
$('.subscribe_key').text(subscribe_key);

$('#subscribe_key').editable({
  unsavedclass: null,
  success: function(r, newValue) {
    var a = updateQueryStringParameter(window.location.href, 'subscribe_key', newValue)
    window.location = a;
  }
});

$('#channel').editable({
  unsavedclass: null,
  success: function(r, newValue){
    var a = updateQueryStringParameter(window.location.href, 'channel', newValue)
    window.location = a;
  }
})

$('#speed').editable({
  unsavedclass: null,
  success: function(r, newValue) {
    b.refresh({
      rate: newValue,
      duration: Math.floor(newValue / 4)
    });
  }
});

$('#limit').editable({
  unsavedclass: null,
  success: function(r, newValue) {
    b.refresh({limit: newValue});
  }
});

$('#xlabel').editable({
  unsavedclass: null,
  success: function(r, newValue) {
    b.refresh({xlabel: newValue});
  }
});

$('#ylabel').editable({
  unsavedclass: null,
  success: function(r, newValue) {
    b.refresh({ylabel: newValue});
  }
});

$('#type').change(function(){
  b.refresh({type: $(this).val()});
});

$('#history').bootstrapToggle('off');
$('#history').change(function() {
  b.refresh({history: $(this).prop('checked') });
});

$('#xgrid').bootstrapToggle('off');
$('#xgrid').change(function() {
  b.refresh({xgrid: $(this).prop('checked') });
});

$('#ygrid').bootstrapToggle('off');
$('#ygrid').change(function() {
  b.refresh({ygrid: $(this).prop('checked') });
});

$('#points').bootstrapToggle('on');
$('#points').change(function() {
  b.refresh({points: $(this).prop('checked') });
});

$('#tooltips').bootstrapToggle('on');
$('#tooltips').change(function() {
  b.refresh({tooltips: $(this).prop('checked') });
});

b = new builder();

});