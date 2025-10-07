var PARAMS;
var SOUND;
var SOUND_VOL = 0.25;
var SAMPLE_RATE = 44100;
var SAMPLE_SIZE = 8;

Params.prototype.query = function () {
  var result = "";
  var that = this;
  $.each(this, function (key,value) {
    if (that.hasOwnProperty(key))
      result += "&" + key + "=" + value;
  });
  return result.substring(1);
};

function gen(fx) {
  PARAMS = new Params();
  PARAMS.sound_vol = SOUND_VOL;
  PARAMS.sample_rate = SAMPLE_RATE;
  PARAMS.sample_size = SAMPLE_SIZE;
  var name;
  if (fx.indexOf("#") == 0) {
    PARAMS.fromB58(fx.slice(1));
    name = "random";
  } else {
    PARAMS[fx]();
    name = fx;
  }
  $("#wav").text(name + ".wav").attr("download", name + ".wav");
  $("#json").text(name + ".json").attr("download", name + ".json");
  updateUi();
  play();
}

function mut() {
  PARAMS.mutate();
  updateUi();
  play();
}

function play(noregen) {
    if (!noregen) {
      var b58 = PARAMS.toB58();
      if (document.location.href.indexOf("#") != -1) {
        document.location.hash = PARAMS.toB58();
      }
      $("#copybuffer").val(b58);
      $("#share").attr("href", "#" + b58)
      SOUND = new SoundEffect(PARAMS).generate();
    }

    $("#wav").attr("href", SOUND.dataURI);
    $("#json").attr("href", 'data:text/plain;charset=UTF-8,' + encodeURIComponent(serialize_params_to_string()));

    SOUND.getAudio().play();
}

function copy() {
    const textToCopy = $("#copybuffer").val();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Optional: Show a success message to the user
        }).catch(err => {
            // Fallback for browsers that don't support the Clipboard API
            oldCopy();
        });
    } else {
        oldCopy();
    }
}

function oldCopy() {
    var b = $("#copybuffer");
    b.show();
    b.select();
    document.execCommand("copy");
    b.hide();
}

function serialize_params_to_string() {
  return JSON.stringify(PARAMS, null, 2);
}

function serialize_params() {
  $("textarea").val(serialize_params_to_string());
  $("#serialize").show();
}

function deserialize_params_from_string(json_string) {
  var newPARAMS = JSON.parse(json_string);
  PARAMS.fromJSON(newPARAMS);
  updateUi();
  play();
}

function deserialize_params() {
  deserialize_params_from_string($("textarea").val());
}

function upload_params_from_file() {
  $("#open_save_impl").click();
}

function on_upload_file_selected(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    $("textarea").val(contents);
    deserialize_params_from_string(contents);
    $("#open_save_impl").val("");
  };
  reader.readAsText(file);
}

function updateDutyCycleControls() {
  var duty = PARAMS.wave_type == 0 || PARAMS.wave_type == 1; // SQUARE or SAWTOOTH
  $("#p_duty").slider("option", "disabled", !duty);
  $("#p_duty_ramp").slider("option", "disabled", !duty);
}

function updateUi() {
    // Update radio buttons
    $("#shape input:radio[value=" + PARAMS.wave_type + "]").prop('checked', true).button("refresh");
    $("#hz input:radio[value=" + PARAMS.sample_rate + "]").prop('checked', true).button("refresh");
    $("#bits input:radio[value=" + PARAMS.sample_size + "]").prop('checked', true).button("refresh");

    // Update all sliders based on PARAMS
    for (var p in sliders) {
        var slider = $('#' + p);
        if (slider.length) {
            var value = PARAMS[p];
            slider.slider("value", value * 1000);
            convert(slider[0], value);
        }
    }

    // Update sound_vol slider separately
    $('#sound_vol').slider("value", SOUND_VOL * 1000);
    $('.gain-slider .slider-value').text(Math.round(SOUND_VOL * 100) + '%');

    updateDutyCycleControls();
}


$(function() {
  $("#shape, #hz, #bits").buttonset();

  $("#shape input:radio").change(function (event) {
    PARAMS.wave_type = parseInt(event.target.value);
    updateDutyCycleControls();
    play();
  });
  $("#hz input:radio").change(function (event) {
    SAMPLE_RATE = PARAMS.sample_rate = parseInt(event.target.value);
    play();
  });
  $("#bits input:radio").change(function (event) {
    SAMPLE_SIZE = PARAMS.sample_size = parseInt(event.target.value);
    play();
  });
  $("button").button();

  // Generic sliders
  $(".slider").not("#sound_vol").slider({
    value: 1000,
    min: 0,
    max: 1000,
    slide: function (event, ui) {
      var value = ui.value / 1000.0;
      PARAMS[event.target.id] = value;
      convert(event.target, value);
    },
    change: function(event, ui) {
      if (event.originalEvent) {
        var value = ui.value / 1000.0;
        PARAMS[event.target.id] = value;
        convert(event.target, value);
        play();
      }
    }
  });

  // Sound volume slider
  $('#sound_vol').slider({
      value: SOUND_VOL * 1000,
      min: 0,
      max: 1000,
      slide: function(event, ui) {
          SOUND_VOL = ui.value / 1000.0;
          $('.gain-slider .slider-value').text(Math.round(SOUND_VOL * 100) + '%');
          play(true);
      },
      change: function(event, ui) {
          if (event.originalEvent) {
            SOUND_VOL = ui.value / 1000.0;
            $('.gain-slider .slider-value').text(Math.round(SOUND_VOL * 100) + '%');
            play(true);
          }
      }
  });

  $(".slider").filter(".signed").
    slider("option", "min", -1000).
    slider("value", 0);

  for (var p in sliders) {
    var control = $('#' + p)[0];
    control.convert = sliders[p];
    control.units = units[p];
  }

  gen(document.location.hash || "pickupCoin");
});

function convert(control, v) {
  if (control.convert) {
    v = control.convert(v);
    control.convertedValue = v;
    if (typeof control.units === 'function')
      v = control.units(v);
    else
      v = v.toPrecision(4) + ' ' + control.units;
    $('label[for="' + control.id + '"] .slider-value').html(v);
  }
}