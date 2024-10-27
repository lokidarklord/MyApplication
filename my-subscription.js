//-----------------------------------
// Table with sorting and search
//-----------------------------------
'use strict';

var App = window.App || {};
App.dynamicTable = function () {
  var _this = this;

  var loadMoreLimit = $('.dynamic-table-section').data('load-more-limit');
  var initialTable = void 0;
  var subsTableHead = document.querySelectorAll('.my-subscription__table-head th');
  var itr = 0;
  var subsBatches = []; // maintaining array of number of 10s and remainder in total number of rows
  var subsTableBody = document.querySelector('.my-subscription__table-body') || {};
  var subscriptionLength = void 0; // get length of the table rows
  var subsTableRows = void 0;
  var subsInputBox = document.getElementById('subscriptionSearchBox');
  var loadMoreSubsBtn = document.querySelector('.my-subscription__load-more > button') || {};
  var clearSearchBtn = document.getElementById('clearMySubscription');
  var searchSubsBtn = document.getElementById('searchMySubscription');
  var searchSubsFlag = false; // to flag status of search result, to sort searched result only when true
  var errorPara = document.querySelector('.errorPara') || {};
  var noSearchErr = document.querySelector('.my-subscription__no-search-err') || {};
  var errorText = void 0;
  var firstName = document.getElementById('firstName');
  var lastName = document.getElementById('lastName');
  var expDate = document.getElementById('expDate');
  var countryName = document.getElementById('countryName');
  var cityName = document.getElementById('cityName');
  var stateName = document.getElementById('stateName');
  var postalCode = document.getElementById('postalCode');
  var toggleSwitch = document.querySelectorAll('.renewer input');
  var inputs = document.querySelectorAll('#resubmitForm input');
  var dateRegex = new RegExp('(0[1-9]|1[0-2])/?([0-9]{4}|[0-9]{2})$');
  var txtRegex = new RegExp('^[a-zA-Z ]*$');
  var creditCardTable = document.getElementById('creditCardTableBody');
  var creditcardarr = void 0;
  var submitSelectedCC = document.querySelector('#submitSelectedCC');
  var today = new Date();
  var countryList = [];
  var stateList = [];
  var selectedCC = void 0;
  var selectedEntitlementRow = void 0;
  var resubmitModalBtn = document.querySelectorAll('.resubmitModalBtn');
  var addnode = document.querySelectorAll('.addnode');
  var convertTopaid = document.querySelectorAll('.convertToPaid');
  var renewModalBtn = document.querySelectorAll('.renewModalBtn');
  var transactType = '';
  var lineItems = document.querySelectorAll('.my-subscription__table-row');
  var rowCls = rowCls;
  var actionBtnCls = '.action-btn';
  var failedStatus = 'failed';
  var expiredStatus = 'expired'
  var notExpiredStatus = 'valid';
  var hiddenCls = 'hidden';
  var expirationDateSelector = '#expirationDate';
  var statusElementSelector = '#itemStatus';
  var zeroTimezoneSymbol = 'Z';
  var activationIdLink = document.querySelectorAll('.activation-id-link');
  var saveEmailsButton = document.querySelector('.save-multiple-emails');
  var activationIdtoSend = '';

  var stripeReset = function stripeReset() {
    var stripeFlag = true;

    for (var i = 0; i < subsTableRows.length; i++) {
      if (subsTableRows[i].style.display !== 'none' && subsTableRows[i].classList.value === 'my-subscription__table-row') {
        if (stripeFlag) {
          subsTableRows[i].style.background = '#f8f8f8';
          stripeFlag = false;
        } else {
          subsTableRows[i].style.background = 'none';
          stripeFlag = true;
        }
      }
    }
  };

  // sorting
  var getCellValue = function getCellValue(tr, idx) {
    return tr.children[idx].innerText || tr.children[idx].textContent;
  };

  var comparer = function comparer(idx, asc) {
    return function (a, b) {
      return function (v1, v2) {
        return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
      }(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    };
  };

  var realSort = function realSort(x, trow) {
    Array.from(trow).sort(comparer(x, _this.asc = !_this.asc)).forEach(function (tr) {
      return subsTableBody.appendChild(tr);
    });
  };

  var sortMySubscription = function sortMySubscription(e) {
    if (e.target) {
      var el = e.target;
      var tgt = Array.from(el.parentNode.children).indexOf(el);
      el.classList.toggle('asc');
      for (var i = 0; i < subsTableHead.length; i++) {
        if (i !== tgt) {
          subsTableHead[i].className = '';
        }
      }

      var trow = document.querySelectorAll('.my-subscription__table-row');
      if (!searchSubsFlag) {
        trow.forEach(function (tr) {
          return tr.classList.remove('hide');
        });
        realSort(tgt, trow);
        for (var _i = subsBatches[itr]; _i < subscriptionLength; _i++) {
          subsTableRows[_i].classList.add('hide');
        }
      } else {
        realSort(tgt, trow);
      }

    }
  };

  // Load More
  var loadMore = function loadMore() {
    // remove display none from the rows
    for (var i = subsBatches[itr]; i < subsBatches[itr + 1]; i++) {
      subsTableRows[i].classList.remove('hide');
    }

    itr++; // maintaining a flag current position in iterations

    // once position reaches the end hide the button
    if (subsBatches[itr] >= subscriptionLength) {
      loadMoreSubsBtn.style.display = 'none';
    }
  };

  var clearMySubscription = function clearMySubscription() {
    if (searchSubsFlag) {
      subsInputBox.value = '';
      subsTableBody.innerHTML = initialTable;
      if (loadMoreSubsBtn) {
        loadMoreSubsBtn.style.display = '';
      }
      searchSubsFlag = false;
      itr = 0;
      searchSubsBtn.classList.remove('hide');
      clearSearchBtn.classList.add('hide');
      checkSearchResult();
    }
  };

  var checkSearchResult = function checkSearchResult() {
    var totalRows = document.querySelectorAll('.my-subscription__table-body > tr');
    var hiddenRows = document.querySelectorAll('.my-subscription__table-body > .hide');
    if (totalRows.length === hiddenRows.length) {
      noSearchErr.classList.remove('hide');
      errorPara.innerText = errorText.replace(/{{searchedText}}/g, '"' + subsInputBox.value + '"');
    } else {
      noSearchErr.className = 'my-subscription__no-search-err hide';
    }
  };

  var searchMySubscription = function searchMySubscription() {
    if (subsInputBox.value) {
      initialTable = subsTableBody.innerHTML
      var filter = subsInputBox.value.toUpperCase().trim();
      for (var i = 0; i < subsTableRows.length; i++) {
        var actvId = subsTableRows[i].querySelectorAll('td')[1];
        var partNum = subsTableRows[i].querySelectorAll('td')[2];
        if (actvId || partNum) {
          var txtValue = actvId.textContent || actvId.innerText;
          var txtValue2 = partNum.textContent || partNum.innerText;
          if (txtValue.toUpperCase().indexOf(filter) > -1 || txtValue2.toUpperCase().indexOf(filter) > -1) {
            subsTableRows[i].classList.remove('hide');
          } else {
            subsTableRows[i].classList.add('hide');
          }
        }
      }
      searchSubsFlag = true;
      if (loadMoreSubsBtn) {
        loadMoreSubsBtn.style.display = 'none';
      }
      searchSubsBtn.classList.add('hide');
      clearSearchBtn.classList.remove('hide');
      checkSearchResult();
    }
  };

  var loadInitialData = function loadInitialData() {

    if (subsTableBody) {
      subscriptionLength = subsTableBody.rows.length;
      subsTableRows = document.querySelector('.my-subscription__table-body').getElementsByTagName('tr') || {};
      // capture initial table set, to restore when search is cleared
      initialTable = subsTableBody.innerHTML;
      errorText = errorPara.innerText;
    }

    // create sets of data
    for (var g = 1; g <= subscriptionLength / loadMoreLimit; g++) {
      subsBatches.push(loadMoreLimit * g);
    }

    if (subscriptionLength % loadMoreLimit > 0) {
      subsBatches.push(subsBatches[subsBatches.length - 1] + subscriptionLength % loadMoreLimit); // push the remainder in the array at the end
    }
  };

  // renewal and submit below

  // ON resubmit button CLICK This will collect row data
  var selectedEntitlement = function selectedEntitlement(e) {
    getCreditCards();

    document.getElementById('resubmitForm').reset();
    selectedEntitlementRow = {
      activationid: e.target.dataset.activationid,
      productid: e.target.dataset.productid,
      quantity: e.target.dataset.quantity,
      duration: e.target.dataset.duration
    };
    transactType = 'RENEWAL'
    countryStates();
  };

  // post sync order

  var syncorder = function syncorder(payload) {
    document.querySelector('.resubmit-success').classList.add('hidden');
    document.querySelector('.resubmit-failed').classList.add('hidden');
    $.ajax({
      type: 'POST',
      url: '/eaton/secure/ecommerce/syncorder',
      data: payload,
      contentType: "application/json",
      dataType: 'json',
      success: function success(response) {
        // hide loader
        const orderId = response?.discreteOrderResponse?.status?.text?.split(':')?.pop()
        orderId ? document.querySelector("#discreteOrderID").innerHTML += orderId : ''
        $.ajax({
          type: 'POST',
          url: '/eaton/secure/ecommerce/order/notification?orderid=' + orderId + '&templateType=beh-email-template',
          data: '',
          contentType: "application/json",
          dataType: 'json',
          success: function success(response) {
          },
          error: function error(_error) {
            console.log(_error);
          }
        })
        document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden')
        document.querySelector('#confim-modal').style = 'display:block';
        document.querySelector('#cards-modal').style = 'display:none';
        document.querySelector('.resubmit-success').classList.remove('hidden');
      },
      error: function error(_error) {
        // hide loader
        document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden')
        document.querySelector('#confim-modal').style = 'display:block';
        document.querySelector('#cards-modal').style = 'display:none';
        document.querySelector('.resubmit-failed').classList.remove('hidden');
      }
    });
  };
  // submitting with cc list
  var submitwexisting = function submitwexisting(e) {
    // show loader
    document.querySelector("div.my-subscription > div.my-sub-loading").classList.remove('hidden')
    var payload = {
      productId: selectedEntitlementRow.productid,
      quantity: selectedEntitlementRow.quantity,
      activationId: selectedEntitlementRow.activationid,
      duration: selectedEntitlementRow.duration,
      paymentToken: selectedCC.paymentToken,
      transactionType: transactType
    };
    syncorder(payload);
  };

  // Object to check form fields has values
  var inputValidator = {
    firstName: false,
    lastName: false,
    expDate: false,
    addressLineOne: false,
    countryName: false,
    stateName: false,
    cityName: false,
    postalCode: false,
    recaptcha: false
  };

  // state value changed
  var changeState = function changeState(e) {
    inputValidator.stateName = true;
    submitEnabler();
  };

  // state value changed
  var recaptchaChecked = function recaptchaChecked() {
    inputValidator.recaptcha = true;
    submitEnabler();
  };

  // country value changed
  var changeCountry = function changeCountry(e) {
    inputValidator.countryName = true;
    submitEnabler();
    var select = document.getElementById('stateName');
    select.innerHTML = '<option disabled>-Select-</option>'; // remove states from previous selection
    var userCountry = e.target.options[e.target.selectedIndex];
    var stateOptns = stateList.filter(function (o) {
      /*eslint-disable */
      return o.countryId == userCountry.dataset.countryId;
      /*eslint-enable */
    });
    for (var i = 0; i < stateOptns.length; i++) {
      var el = document.createElement('option');
      el.innerText = stateOptns[i].stateName;
      el.dataset.stateId = stateOptns[i].stateId;
      el.dataset.countryId = stateOptns[i].countryId;
      el.dataset.stateCode = stateOptns[i].stateCode;
      select.appendChild(el);
    }
  };

  // loads countryList
  var countryStates = function countryStates() {
    var url = '/eaton/my-eaton/fields';
    var select = document.getElementById('countryName');
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json', // added data type
      success: function success(res) {
        countryList = res.validCountries;
        stateList = res.validStates;
        for (var i = 0; i < countryList.length; i++) {
          var el = document.createElement('option');
          el.innerText = countryList[i].countryName;
          el.dataset.countryCode = countryList[i].countryCode;
          el.dataset.countryId = countryList[i].countryId;
          select.appendChild(el);
        }
      },
      error: function error(err) {
        console.log(err);
      }
    });
  };

  // checked input fields and enables form submit
  var submitEnabler = function submitEnabler() {
    var buttonSend = document.getElementById('resubmitFormSubmit');
    var allTrue = Object.keys(inputValidator).every(function (item) {
      return inputValidator[item] === true;
    });
    if (allTrue) {
      buttonSend.disabled = false;
    } else {
      buttonSend.disabled = true;
    }
  };

  // marks input fields as per filled or not
  var validator = function validator(e) {
    var name = e.target.getAttribute('name');
    if (e.target.value.length > 0) {
      inputValidator[name] = true;
    } else {
      inputValidator[name] = false;
    }
    submitEnabler();
  };

  var validate = function validate() {
    var userMonth = expDate.value;
    var today = new Date();
    var currentMonth = new Date(userMonth.slice(3), userMonth.slice(0, 2), 1);

    if (!dateRegex.test(expDate.value) || currentMonth < today || !txtRegex.test(firstName.value) || !txtRegex.test(lastName.value) || !txtRegex.test(cityName.value) || isNaN(postalCode.value)) {

      if (!dateRegex.test(expDate.value) || currentMonth < today) {
        expDate.style = 'border: 1px solid #ff0000';
      }
      if (!txtRegex.test(firstName.value)) {
        firstName.style = 'border: 1px solid #ff0000';
      }
      if (!txtRegex.test(lastName.value)) {
        lastName.style = 'border: 1px solid #ff0000';
      }
      if (!txtRegex.test(cityName.value)) {
        cityName.style = 'border: 1px solid #ff0000';
      }
      if (isNaN(postalCode.value)) {
        postalCode.style = 'border: 1px solid #ff0000';
      }
      return false;
    } else {
      return true;
    }
  };

  var autorenewal = function autorenewal(change, e) {
    var thisAutoRenewal = e.target;
    thisAutoRenewal.classList.add('hidden');
    thisAutoRenewal.parentElement.nextElementSibling.classList.remove('hidden');
    var url = '/eaton/secure/ecommerce/entitlement/update';
    var payload = {
      activationId: thisAutoRenewal.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('.activation-id').innerText,
      AutoRenewal: change,
      AutoRenewalStatus: ''
    };

    $.ajax({
      type: 'POST',
      url: url,
      data: payload,
      contentType: "application/json",
      dataType: 'json',
      success: function success(response) {
        // if toggle is success we need to refresh the page
        window.location.reload();
      },
      error: function error(_error2) {
        if (change === 'ON') {
          e.target.checked = false;
          thisAutoRenewal.classList.remove('hidden');
          thisAutoRenewal.parentElement.nextElementSibling.classList.add('hidden');
        }
        if (change === 'OFF') {
          e.target.checked = true;
          thisAutoRenewal.classList.remove('hidden');
          thisAutoRenewal.parentElement.nextElementSibling.classList.add('hidden');
        }
        $('#resubmit-fail-modal').modal('show');
      }
    });
  };

  var onoff = function onoff(e) {
    // if true turn on auto renew else off
    e.target.checked ? autorenewal('ON', e) : autorenewal('OFF', e);
  };

  var selectThisCC = function selectThisCC(e) {
    var allCards = creditcardarr.creditCards;
    var selectedIndex = e.target.dataset.index;
    selectedCC = allCards[selectedIndex];
    document.querySelector('#submitSelectedCC').disabled = false;
  };

  var deleteThisCC = function deleteThisCC(e) {
    creditcardarr = creditcardarr.creditCards;
    creditcardarr = creditcardarr.find(function (o) {
      return o.creditCardNumber === e.target.dataset.cc;
    });

    var url = '/eaton/secure/ecommerce/creditcard?creditCardToken=';

    $.ajax({
      url: url + creditcardarr.paymentToken,
      type: 'DELETE',
      success: function success(result) {
        // delete Table rows here and call get cc
        document.querySelector('#creditCardTableBody').innerHTML = '';
        getCreditCards();
      },
      error: function error(_error3) {
        console.log(_error3);
      }
    });
  };

  var loadcc = function loadcc(cc) {
    var creditCards = cc.creditCards;
    creditCards.forEach(function (c, index) {
      var fullDate = new Date(c.expirationMonth, c.expirationYear, 1);

      var el = document.createElement('tr');

      var radioCell = el.insertCell(0);
      var radioCC = document.createElement('input');
      radioCC.setAttribute('type', 'radio');
      radioCC.setAttribute('name', 'radio');
      radioCC.setAttribute('class', 'cards-radio');
      radioCC.dataset.index = index;
      radioCC.addEventListener('change', selectThisCC);
      radioCell.appendChild(radioCC);

      var iconCell = el.insertCell(-1);
      if (c.creditCardType == 'american express') {
        iconCell.innerHTML = '<span><img src="/content/dam/eaton/resources/shopping-cart/amex_icon.png" height="35"></span>';
      } else if (c.creditCardType == 'mastercard') {
        iconCell.innerHTML = '<span><img src="/content/dam/eaton/resources/shopping-cart/mastercard_icon.png" height="35"></span>';
      } else if (c.creditCardType == 'visa') {
        iconCell.innerHTML = '<span><img src="/content/dam/eaton/resources/shopping-cart/visa_icon.png" height="35"></span>';
      } else {
        iconCell.innerHTML = '<span class="glyphicon glyphicon-credit-card"></span>';
      }
      var creditCardTypeCell = el.insertCell(-1);
      creditCardTypeCell.setAttribute('class', 'capitalize');

      if (fullDate < today) {
        creditCardTypeCell.innerHTML = c.creditCardType + ' ending with ' + c.creditCardNumber + '<br> <span style="color: #f00">' + c.expirationMonth + '/' + c.expirationYear + ' Expired</span>';
      } else {
        creditCardTypeCell.innerHTML = c.creditCardType + ' ending with ' + c.creditCardNumber + '<br>' + c.expirationMonth + '/' + c.expirationYear;
      }

      var delCell = el.insertCell(-1);
      var del = document.createElement('a');
      del.setAttribute('href', 'javascript:void(0)');
      del.setAttribute('class', 'delete');
      del.textContent = 'Delete card';
      del.dataset.cc = c.creditCardNumber;
      del.addEventListener('click', deleteThisCC);
      delCell.appendChild(del);

      creditCardTable.appendChild(el);
      radioCC;
    });
  };
  var getCreditCards = function getCreditCards() {
    document.querySelector('#creditCardTableBody').innerHTML = '';
    var ccurl = '/eaton/secure/ecommerce/creditcard';
    $.ajax({
      url: ccurl,
      type: 'GET',
      dataType: 'json', // added data type
      success: function success(res) {
        creditcardarr = res;
        if (res.creditCards && res.creditCards.length > 0) {
          loadcc(res); // To create table cells and push data in it
        }
      },
      error: function error(err) {
        console.log(err);
      }
    });
  };

  var onSubmit = function onSubmit(token, ccBrand) {
    var addressLine2 = document.getElementById('addressLineTwo');
    if (addressLine2.value === null) {
      addressLine2 = document.getElementById('addressLineTwo').value;
    } else {
      addressLine2 = '';
    }

    var addr = {
      addressLine1: document.querySelector('#addressLineOne').value,
      addressLine2: addressLine2,
      city: document.querySelector('#cityName').value,
      state: document.querySelector('#stateName').options[document.querySelector('#stateName').selectedIndex].dataset.stateCode,
      postalCode: document.querySelector('#postalCode').value,
      country: document.querySelector('#countryName').options[document.querySelector('#countryName').selectedIndex].dataset.countryCode
    };
    var paymentInfoFormSubmit = {
      addCreditCard: {
        firstName: document.querySelector('#firstName').value,
        lastName: document.querySelector('#lastName').value,
        creditCardNumber: token.content.paymentInformation.card.number.maskedValue.slice(-4),
        creditCardType: ccBrand,
        expirationMonth: document.querySelector('#expDate').value.split('/')[0],
        expirationYear: document.querySelector('#expDate').value.split('/')[1],
        creditCardTransientToken: token.jti,
        creditCardBillingAddress: addr
      }
    };
    // ajax post save

    $.ajax({
      type: 'POST',
      url: '/eaton/secure/ecommerce/creditcard',
      data: JSON.stringify(paymentInfoFormSubmit),
      contentType: "application/json",
      dataType: 'json',
      success: function success(response) {
        var payload = {
          productId: selectedEntitlementRow.productid,
          productIdQualifier: 'CAT',
          quantity: selectedEntitlementRow.quantity,
          activationId: selectedEntitlementRow.activationid,
          transactionType: transactType,
          duration: selectedEntitlementRow.duration,
          paymentToken: response.paymentToken
        };
        syncorder(payload);
      },
      error: function error(_error4) {
        console.log(_error4);
        // hide loader
        document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden')
      }
    });
  };

  var parseJwt = function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  };

  var initializeFlex = function initializeFlex() {
    $.ajax({
      type: 'GET',
      url: '/eaton/secure/ecommerce/cyb/capturecontext',
      success: function success(response) {
        var captureContext = response.keyId;

        var myStyles = {
          input: {
            'font-size': '16px',
            'font-family': 'helvetica, tahoma, calibri, sans-serif',
            color: '#555'
          },
          ':focus': { color: 'blue' },
          ':disabled': { cursor: 'not-allowed' },
          valid: { color: '#3c763d' },
          invalid: { color: '#a94442' }
        };
        /*eslint-disable */
        var flex = new Flex(captureContext);
        /*eslint-enable */
        var microform = flex.microform({ styles: myStyles });
        var cNumber = microform.createField('number', { placeholder: '' });
        var securityCode = microform.createField('securityCode', { placeholder: '' });
        var ccBrand = void 0;
        cNumber.load('#number-container');
        securityCode.load('#securityCode-container');
        cNumber.on('change', function (data) {
          if (data.card.length > 0) {
            ccBrand = data.card[0].brandedName;
          }
        });
        document.querySelector('#resubmitFormSubmit').addEventListener('click', function () {
          if (validate() && document.querySelector('#rc').checked) {
            // show loader
            document.querySelector("div.my-subscription > div.my-sub-loading").classList.remove('hidden')
            var options = {
              expirationMonth: document.querySelector('#expDate').value.split('/')[0],
              expirationYear: document.querySelector('#expDate').value.split('/')[1]
            };
            microform.createToken(options, function (err, token) {
              if (err) {
                document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden');
                document.querySelector('#confim-modal').style = 'display:block';
                document.querySelector(".cybersource-failed").classList.remove('hidden');
                console.log(err);
              } else {
                var TransientToken = JSON.stringify(token);
                TransientToken = parseJwt(TransientToken);
                onSubmit(TransientToken, ccBrand);
              }
            });
          }
        });
      },
      error: function error(_error5) {
        console.log(_error5);
      }
    });
  };

  var openAddNodePopup = function openAddNodePopup(e) {
    var mod = document.querySelector('#addnode-modal .modal-body')
    mod.querySelector('.quantity').value = e.target.dataset.quantity
    mod.querySelector('.product-name').innerText = e.target.dataset.name
    mod.querySelector('.part-number').innerText = e.target.dataset.productid
    mod.querySelector('.part-number').dataset.duration = e.target.dataset.duration
    mod.querySelector('.activation-id').innerText = e.target.dataset.activationid
    if (e.target.dataset.price === undefined || e.target.dataset.price === null) {
      document.getElementById('submitNode').disabled = true
      mod.querySelector('.unit-price').innerText = 'NA'
      mod.querySelector('.price').innerText = 'NA'
    } else {
      document.getElementById('submitNode').disabled = false
      mod.querySelector('.unit-price').innerText = e.target.dataset.price
      mod.querySelector('.price').innerText = e.target.dataset.price
    }
  }
  // trial transaction
  var goConvertTopaid = function goConvertTopaid(e) {
    var mod = document.querySelector('#paidSubscription-modal .modal-body')
    mod.querySelector('.quantity').value = e.target.dataset.quantity
    mod.querySelector('.product-name').innerText = e.target.dataset.name
    mod.querySelector('.part-number').innerText = e.target.dataset.productid
    mod.querySelector('.part-number').dataset.duration = e.target.dataset.duration
    mod.querySelector('.activation-id').innerText = e.target.dataset.activationid
    if (e.target.dataset.price === undefined || e.target.dataset.price === null) {
      document.getElementById('submitNode').disabled = true
      mod.querySelector('.unit-price').innerText = 'NA'
      mod.querySelector('.price').innerText = 'NA'
    } else {
      document.getElementById('submitNode').disabled = false
      mod.querySelector('.unit-price').innerText = e.target.dataset.price
      mod.querySelector('.price').innerText = e.target.dataset.price
    }
    getTrialTransaction(e.target.dataset.productline, mod)
  }

  var getTrialTransaction = function getTrialTransaction(productline, modal) {
    document.querySelector('#submitTrailTransaction').setAttribute('disabled', true);
    var errorProductList = document.getElementById('errorProductList');
    var productListLoader = document.getElementById('loaderForProductList');
    productListLoader.classList.remove('hidden')
    var list = document.querySelector('#productList')
    list.innerHTML = '';
    // passing EMCB for now, as only EMCB can have this upgrade functionality
    var url = '/eaton/secure/softwaredelivery/trialTransaction.nocache.json?productLine=EMCB';
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json', // added data type
      success: function success(res) {
        var products = res.products
        productListLoader.classList.add('hidden')
        if (res.statusInfo.total > 0) {
          errorProductList.classList.add('hidden')
          // trial transaction products as list of radio buttons
          for (var i = 0; i < products.length; i++) {
            if (products[i].partNumbers.length > 0) {
              var parts = products[i].partNumbers
              parts.forEach(function (part) {
                if (part.primaryKeys.partId.toLowerCase().indexOf('trial') === -1) {
                  var radioDiv = document.createElement('div');
                  radioDiv.classList.add('col-md-1')
                  var radio = document.createElement('input');
                  radio.classList.add('cards-radio');
                  radio.attributes.type = 'radio';
                  radio.setAttribute('type', 'radio');
                  radio.setAttribute('data-product', part.primaryKeys.partId);
                  radio.setAttribute('name', 'trial_transaction');
                  radio.setAttribute('value', part.primaryKeys.partId);
                  radio.addEventListener('change', selectedUpgradeOption);
                  radioDiv.appendChild(radio)
                  var labelDiv = document.createElement('div');
                  labelDiv.classList.add('col-md-11')
                  var p = document.createElement('p');
                  part.licenseModel ? p.innerText = part.licenseModel.primaryKeys.name + ',' + part.primaryKeys.partId : p.innerText = part.primaryKeys.partId;
                  labelDiv.appendChild(p);
                  list.appendChild(radioDiv);
                  list.appendChild(labelDiv);
                  list.appendChild(document.createElement('br'))
                }
              })
            }
          }
        } else {
          errorProductList.classList.remove('hidden')
          productListLoader.classList.add('hidden')
        }
      },
      error: function error(err) {
        console.log(err);
        errorProductList.classList.remove('hidden')
        productListLoader.classList.add('hidden')
      }
    });
  }
  
  var formatCardExpiryDate = function formatCardExpiryDate(e){
    const input = event.target;
    let inputValue = input.value;

    // Allow only digits and "/"
    const sanitizedValue = inputValue.replace(/[^\d/]/g, '');

    // Restrict the length to 7 characters (mm/yyyy)
    const formattedValue = sanitizedValue.slice(0, 7);

    // Automatically add "/" after the second digit if it's not already there
    if (formattedValue.length === 2 && inputValue.length === 2) {
      input.value = formattedValue + "/";
      return;
    }

    // Format the value with "/"
    const formattedInput = formattedValue.replace(/^(\d{2})(\d{0,4})$/, "$1/$2");

    // Update the input field value
    input.value = formattedInput;
  }

  var handleBackspace = function handleBackspace(e) {
    const key = event.key;
    const input = event.target;
    const inputValue = input.value;

    // Allow only digits, "/", Backspace, and Delete keys
    const allowedKeys = ["Backspace", "Delete"];
    const isAllowedKey = /^\d$/.test(key) || allowedKeys.includes(key);

    // Allow only one slash in the input
    const hasSlash = inputValue.includes("/");
    const isSlashTyped = key === "/";
    if (hasSlash && isSlashTyped) {
      event.preventDefault();
    }

    // Handle Backspace and Delete for removing "/"
    if (key === "Backspace" || key === "Delete") {
      const cursorPosition = input.selectionStart;
      const isSlashAtCursorPosition = inputValue[cursorPosition - 1] === "/";
      const isLastCharacter = cursorPosition === inputValue.length;

      if (isSlashAtCursorPosition && isLastCharacter && key === "Backspace") {
        // Remove preceding digit along with "/"
        input.value = inputValue.slice(0, cursorPosition - 2) + inputValue.slice(cursorPosition);
        event.preventDefault();
      } else if (isSlashAtCursorPosition && key === "Delete") {
        // Remove "/" when the cursor is on it
        input.value = inputValue.slice(0, cursorPosition - 1) + inputValue.slice(cursorPosition);
        event.preventDefault();
      }
    }

    if (!isAllowedKey) {
      event.preventDefault();
    }
  }

  var selectedUpgradeOption = function selectedUpgradeOption(e) {

    var url = '/eaton/secure/ecommerce/retrieve/product.nocache.json?product-id=' + e.target.value;
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json', // added data type
      success: function success(res) {
        if (res.price) {
          document.querySelector('#paidSubscription-modal .modal-body .price').textContent = res.price * document.querySelector('#paidSubscription-modal .modal-body .quantity').value
          document.querySelector('#paidSubscription-modal .modal-body .unit-price').textContent = res.price
        }
      },
      error: function error(err) {
        console.log(err);
      }
    });
    selectedEntitlementRow = {
      activationid: document.querySelector("#paidSubscription-modal .activation-id").innerText,
      quantity: document.querySelector("#paidSubscription-modal .quantity").value,
      productid: e.target.value,
      duration: document.querySelector("#paidSubscription-modal .part-number").dataset.duration
    };
    transactType = '';
    var submitTrailTransaction = document.querySelector('#submitTrailTransaction')
    submitTrailTransaction.removeAttribute('disabled');
    submitTrailTransaction.setAttribute('data-target', '#cards-modal');
  }

  var submitTrailTransactionFun = function submitTrailTransactionFun() {
    if (selectedEntitlementRow.productId != undefined || selectedEntitlementRow.productId != '') {
      getCreditCards();
      document.getElementById('resubmitForm').reset();
      transactType = '';
      countryStates();
    }
  }

  var priceHandlerFun = function priceHandlerFun(e) {
    var action = e.target.dataset.action
    var parent = e.target.dataset.parent
    parent = document.getElementById(parent)
    var quantity = parent.querySelector('.quantity')
    var qty = quantity.value
    var uint = parent.querySelector('.unit-price').innerText
    var price = parent.querySelector('.price')
    if (action === 'increase') {
      // increase value
      if (qty > 0) {
        qty++
        quantity.value = qty
        uint = uint.replace(/\,/g, '');
        uint = parseInt(uint, 10);
        price.innerText = uint * qty
        price.innerText = price.innerText.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      }
    } else {
      // decrease value
      if (qty > 1) {
        qty--
        quantity.value = qty
        uint = uint.replace(/\,/g, ''); // 1125, but a string, so convert it to number
        uint = parseInt(uint, 10);
        price.innerText = uint * qty
        price.innerText = price.innerText.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      }
    }
  }

  var checker = function checker(e) {
    const val = e.target.value
    var parent = e.target.dataset.parent
    parent = document.getElementById(parent)
    const pryce = parent.querySelector('.price').innerText
    if (isNaN(val)) {
      e.target.value = e.target.value.slice(0, -1);
    } else if (val == 0 || val === null) {
      e.target.classList.add('error')
    } else {
      if (pryce === 'NA' || pryce === 'NaN') {
        document.getElementById('submitNode').disabled = true
      }
      e.target.classList.remove('error')
      var uint = parent.querySelector('.unit-price').innerText
      uint = uint.replace(/\,/g, '');
      uint = parseInt(uint, 10);
      var price = parent.querySelector('.price')
      price.innerText = uint * val
      price.innerText = price.innerText.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }
  }

  var submitNodeFnc = function submitNodeFnc() {
    getCreditCards();
    document.getElementById('resubmitForm').reset();

    selectedEntitlementRow = {
      activationid: document.querySelector("#addnode-modal .activation-id").innerText,
      quantity: document.querySelector("#addnode-modal .quantity").value,
      productid: document.querySelector("#addnode-modal .part-number").innerText,
      duration: document.querySelector("#addnode-modal .part-number").dataset.duration
    };
    transactType = '';
    countryStates();
  }
  var selectedActivationId = function selectedActivationId(e) {
    document.querySelector("div.my-subscription > div.my-sub-loading").classList.remove('hidden');
    document.querySelector('.email-error').classList.add('hidden');
    activationIdtoSend = e.target.innerText;
    var url = '/eaton/secure/softwaredelivery/activationid?activationId=' + activationIdtoSend;
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json', // added data type
      success: function success(res) {
        document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden');
        var mod = document.querySelector('#multipleEmails-modal .modal-body')
        mod.querySelector('.multiple-emails-input').value = res.entitlement[0].simpleEntitlement.shipToEmail;
      },
      error: function error(err) {
        document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden');
        console.log(err);
      }
    });
  }
  var saveMultipleEmails = function addedEmailAddresses(e) {
    var payloadEmail;
    var isValid;
    var emailstoSend = document.querySelector("#multipleEmails-modal .multiple-emails-input").value;
    var str_array = emailstoSend.split(',');
    for (var i = 0; i < str_array.length; i++) {
      // Trim the excess whitespace.
      str_array[i] = (str_array[i].replace(/^\s*/, "").replace(/\s*$/, "")).toLowerCase();
      var regexMail = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
      isValid = regexMail.test(str_array[i]);
      if (!isValid) {
        document.querySelector('.email-error').classList.remove('hidden');
        return;
      }
    }
    if (isValid) {
      document.querySelector("div.my-subscription > div.my-sub-loading").classList.remove('hidden')
      payloadEmail = {
        'entitlement': [
          {
            'email': [
              emailstoSend
            ],
            'activationId': activationIdtoSend
          }
        ]
      }
      var url = '/eaton/secure/softwaredelivery/activationIdMultipleEmail.nocache.json';
      $.ajax({
        url: url,
        data: JSON.stringify(payloadEmail),
        type: 'POST',
        dataType: 'json', // added data type
        contentType: 'application/json',
        success: function success(res) {
          document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden');
          document.querySelector('#multipleEmails-modal').style = 'display:none';
          document.querySelector('#confim-modal').style = 'display:block';
          document.querySelector('.multipleEmails-success').classList.remove('hidden');
        },
        error: function error(err) {
          document.querySelector('.email-error').classList.add('hidden');
          document.querySelector("div.my-subscription > div.my-sub-loading").classList.add('hidden');
          document.querySelector('#multipleEmails-modal').style = 'display:none';
          document.querySelector('#confim-modal').style = 'display:block';
          document.querySelector('.multipleEmails-failed').classList.remove('hidden');
        }
      });
    }
  }
  var bindEvents = function bindEvents() {
    if (subsTableBody) {
      if (subscriptionLength > loadMoreLimit) {
        loadMoreSubsBtn.addEventListener('click', loadMore);
      }
      clearSearchBtn.addEventListener('click', clearMySubscription);
      searchSubsBtn.addEventListener('click', searchMySubscription);
      subsTableHead.forEach(function (el) {
        return el.addEventListener('click', sortMySubscription);
      });
      if (toggleSwitch) {
        toggleSwitch.forEach(function (ts) {
          return ts.addEventListener('change', onoff);
        });
      }
      initializeFlex();
    }
    inputs.forEach(function (input) {
      input.addEventListener('keyup', validator);
    });
	expDate.addEventListener('input', formatCardExpiryDate);
	expDate.addEventListener('keydown', handleBackspace);
    var submitNode = document.getElementById('submitNode')
    if (submitNode) {
      submitNode.addEventListener('click', submitNodeFnc)
    }
    var submitTrailTransaction = document.getElementById('submitTrailTransaction')
    if (submitTrailTransaction) {
      submitTrailTransaction.addEventListener('click', submitTrailTransactionFun)
    }
    if (document.querySelector("#rc")) {
      document.querySelector("#rc").addEventListener('change', recaptchaChecked);
    }
    if (renewModalBtn) {
      renewModalBtn.forEach(function (renew) {
        renew.addEventListener('click', selectedEntitlement);
      });
    }
    if (activationIdLink) {
      activationIdLink.forEach(function (activationId) {
        activationId.addEventListener('click', selectedActivationId);
      });
    }
    if (saveEmailsButton) {
      saveEmailsButton.addEventListener('click', saveMultipleEmails);
    }
    var qtyinput = document.querySelector("#addnode-modal input.quantity")
    if (qtyinput) {
      qtyinput.addEventListener('keyup', checker);
    }
    var pricehandler = document.querySelectorAll('#addnode-modal .pricehandler')
    if (pricehandler) {
      pricehandler.forEach(function (ph) {
        ph.addEventListener('click', priceHandlerFun)
      })
    }
    var trialQtyinput = document.querySelector("#paidSubscription-modal input.quantity")
    if (trialQtyinput) {
      trialQtyinput.addEventListener('keyup', checker);
    }
    var trialPricehandler = document.querySelectorAll('#paidSubscription-modal .pricehandler')
    if (trialPricehandler) {
      trialPricehandler.forEach(function (ph) {
        ph.addEventListener('click', priceHandlerFun)
      })
    }
    resubmitModalBtn.forEach(function (resubmit) {
      resubmit.addEventListener('click', selectedEntitlement);
    });
    addnode.forEach(function (an) {
      an.addEventListener('click', openAddNodePopup)
    })
    convertTopaid.forEach(function (an) {
      an.addEventListener('click', goConvertTopaid)
    })
    if (submitSelectedCC) {
      submitSelectedCC.addEventListener('click', submitwexisting);
    }
    countryName.addEventListener('change', changeCountry);
    stateName.addEventListener('change', changeState);
  };

  var init = function init() {
    var mysubs = document.querySelectorAll(".my-subscription.dynamic-table-section")
    mysubs.forEach(function (mysub) {
      if (mysub.dataset.shouldHide == 'true') {
        mysub.closest(".panel").style.display = 'none'
      } else if (mysub.dataset.shouldHide == 'hideMySubscription') {
        mysub.closest(".my-subscription.dynamic-table-section").style.display = 'none'
      } else {
        loadInitialData();
        processLineItems();
        bindEvents();
      }
    })
  };

  var processLineItems = function () {
    lineItems.forEach(function (item) {
      var expirationDateEle = item.querySelector(expirationDateSelector);
      var actionButtons = item.querySelectorAll(actionBtnCls);
      var actionType = 0;
      if (item.dataset.expirationDate) {
        // meaning there's an expiration date
        var expDate;
        if (item.dataset.expirationDate.endsWith(zeroTimezoneSymbol)) {
          expDate = new Date(item.dataset.expirationDate);
        } else {
          expDate = new Date(item.dataset.expirationDate + zeroTimezoneSymbol);
        }
        if (expDate) {
          expirationDateEle.innerText = new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }).format(expDate);
          var itemExpired = expDate < new Date();
          if (!item.dataset.itemStatus) {
            // this mean we need to calculate Expire or Not
            var status = itemExpired ? expiredStatus : notExpiredStatus;
            item.querySelector(statusElementSelector).innerText = status
            item.querySelector(statusElementSelector).classList.add(status)
          }
          var withinCategory = item.dataset.itemWithinCategory;
          var autoRenewalStatus = item.dataset.itemAutoRenewalStatus;
          var showRenewButton = shouldShowRenewButton(expDate, autoRenewalStatus, withinCategory);
          if (!itemExpired && withinCategory !== undefined) {
            if (item.querySelector('.add-node-btn')) {
              item.querySelector('.add-node-btn').classList.remove(hiddenCls)
            }
          }
          var isStatusFailed = isLineItemStatusFailed(autoRenewalStatus);
          if (!showRenewButton && !isStatusFailed) {
            actionType = 0;
          } else if (!showRenewButton && isStatusFailed) {
            actionType = 1;
          } else if (showRenewButton) {
            actionType = 2;
          }
        }
      }
      actionButtons[actionType].classList.remove(hiddenCls);
    });
  }


  var getLineItemStatus = function (expDate, autoRenewalStatus) {
    if (autoRenewalStatus) {
      return autoRenewalStatus;
    }
    if (!expDate) {
      return notExpiredStatus;
    }
    return expDate < new Date() ? expiredStatus : notExpiredStatus;
  }

  var shouldShowRenewButton = function (expDate, autoRenewalStatus, withinCategory) {
    if (withinCategory === undefined) {
      return false;
    }
    var lineStatus = getLineItemStatus(expDate, autoRenewalStatus);
    return lineStatus === expiredStatus;
  }

  var isLineItemStatusFailed = function (autoRenewalStatus) {
    if (autoRenewalStatus && autoRenewalStatus === failedStatus) {
      return true;
    }
    return false;
  }


  /**
   * If containing DOM element is found, Initialize and Expose public methods
   */
  if ($('.my-subscription__table-container').length > 0) {
    init();
  }
}();