/// <reference path="../references.ts" />
/**
 * ProcessOut module/namespace
 */
var ProcessOut;
(function (ProcessOut_1) {
    /**
     * ProcessOut main class
     */
    var ProcessOut = (function () {
        /**
         * ProcessOut constructor
         * @param  {string} projectId ProcessOut project ID
         */
        function ProcessOut(projectId) {
            /**
             * Timeout before considering the modal could not be loaded
             * @type {Number}
             */
            this.timeout = 50000;
            /**
             * String prefixed to every HTML class generated by ProcessOut.js
             * @type {string}
             */
            this.cssPrefix = "processout-";
            this.projectId = projectId;
            this.setup();
        }
        /**
         * Get the ProcessOut endpoint of the given subdomain
         * @param  {string} subdomain
         * @param  {string} path
         * @return {string}
         */
        ProcessOut.prototype.endpoint = function (subdomain, path) {
            return "https://" + subdomain + ".processout.com" + path;
        };
        /**
         * Prefixes the given class names
         * @param  {string} name
         * @return {string}
         */
        ProcessOut.prototype.classNames = function () {
            var names = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                names[_i - 0] = arguments[_i];
            }
            var str = "";
            for (var _a = 0; _a < names.length; _a++) {
                var n = names[_a];
                if (str != "") {
                    str += " ";
                }
            }
            str += this.cssPrefix + n;
            return str;
        };
        /**
         * Perform a request to the ProcessOut API
         * @param  {string} method
         * @param  {string} path
         * @param  {Object} data
         * @param  {callback} success
         * @param  {callback} error
         * @return {void}
         */
        ProcessOut.prototype.apiRequest = function (method, path, data, success, error) {
            if (method != "get")
                data = JSON.stringify(data);
            $.ajax({
                method: method,
                headers: {
                    "API-Version": "1.1.0.0",
                    "Authorization": "Basic " + btoa(this.projectId + ':')
                },
                url: this.endpoint("api", path),
                data: data,
                contentType: "application/json",
                success: function (data, code, jqxhr) {
                    success(data, code, jqxhr);
                },
                error: function (request, err) {
                    error(request, err);
                }
            });
        };
        ProcessOut.prototype.setup = function () {
            this.apiRequest("get", "/gateways", {}, function (data, code, jqxhr) {
                if (!data.success) {
                    throw new Error(data.message);
                }
                for (var _i = 0, _a = data.gateways; _i < _a.length; _i++) {
                    var gateway = _a[_i];
                    var g = ProcessOut_1.Gateways.Handler.buildGateway(this, gateway, "", ProcessOut_1.Flow.None);
                    console.log(g);
                    g.setup();
                }
            }, function () {
                throw new Error("Could not load project's gateways. Are you sure your project ID is valid?");
            });
        };
        /**
         * Set the customer of the current request
         * @param  {Customer} customer
         * @return {void}
         */
        ProcessOut.prototype.setCustomer = function (customer) {
            this.customer = customer;
        };
        /**
         * Get the current request's customer, if any
         * @return {Customer}
         */
        ProcessOut.prototype.getCustomer = function () {
            return this.customer;
        };
        /**
         * Create a new modal
         * @param  {string}   url
         * @param  {callback} success
         * @param  {callback} error
         * @return {void}
         */
        ProcessOut.prototype.newModal = function (url, success, error) {
            var uniqId = Math.random().toString(36).substr(2, 9);
            var iframe = jQuery("<iframe/>");
            iframe.addClass("processout-iframe")
                .attr("id", "processout-iframe-" + uniqId)
                .attr("src", url)
                .attr("style", "position: fixed; top: 0; left: 0; background: none;"
                + "-webkit-transform:translateZ(1px);\n                    -moz-transform:translateZ(1px);\n                    -o-transform:translateZ(1px);\n                    transform:translateZ(1px);")
                .attr("frameborder", "0")
                .attr("allowtransparency", "1");
            // Hide and add our iframe to the DOM
            iframe.hide();
            iframe.appendTo("body");
            var iframeError = setTimeout(function () {
                if (typeof (error) === typeof (Function))
                    error({
                        code: ProcessOut_1.ErrorCode.ProcessOutUnavailable,
                        message: "Could not properly load the modal."
                    });
            }, this.timeout);
            iframe.load(function () {
                clearTimeout(iframeError);
                if (typeof (success) === typeof (Function))
                    success(new ProcessOut_1.Modal(this, iframe, uniqId));
            });
        };
        /**
         * Find an invoice by its ID
         * @param  {string}   uid
         * @param  {callback} success
         * @param  {callback} error
         * @return {void}
         */
        ProcessOut.prototype.findInvoice = function (uid, success, error) {
            var invoice = new ProcessOut_1.Invoice(this);
            invoice.find(uid, success, error);
        };
        return ProcessOut;
    })();
    ProcessOut_1.ProcessOut = ProcessOut;
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../references.ts" />
/**
 * ProcessOut module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    /**
     * ProcessOut Modal class
     */
    var Modal = (function () {
        /**
         * Modal constructor
         * @param  {domElement} iframe
         * @param  {string}     uniqId
         */
        function Modal(instance, iframe, uniqId) {
            /**
             * Namespace used when sending messages to iframe
             * @type {String}
             */
            this.namespace = 'processout';
            /**
             * Specifies if the modal was deleted
             * @type {Boolean}
             */
            this.deleted = false;
            this.instance = instance;
            this.iframe = iframe;
            this.uniqId = uniqId;
        }
        /**
         * Show the modal
         * @param  {Function} onShow
         * @param  {Function} onHide
         * @param  {Function} error
         * @return {void}
         */
        Modal.prototype.show = function (onShow, onHide, error) {
            var modal = this;
            var iframe = modal.iframe;
            var iframeW = iframe.get(0).contentWindow;
            var frameid = modal.uniqId;
            iframeW.postMessage(this.namespace + " " + frameid + " check", "*");
            var redirectTimeout = setTimeout(function () {
                if (typeof (error) === typeof (Function))
                    error({
                        message: "The modal does not seem to be available.",
                        code: "modal.unavailable"
                    });
            }, this.instance.timeout);
            var oldCursor = jQuery("body").css("cursor");
            function receiveMessage(event) {
                var eventSplit = event.data.split(" ");
                if (eventSplit[0] != modal.namespace)
                    return;
                if (eventSplit[1] != frameid)
                    return;
                switch (eventSplit[2]) {
                    case "openModal":
                        // Clear the timeout
                        clearTimeout(redirectTimeout);
                        // Make sure that we can't scroll behind the modal
                        jQuery("body").css("overflow", "hidden");
                        // Make sure our iframe is of the correct dimension
                        jQuery(window).resize(function () {
                            iframe.width(jQuery(window).outerWidth());
                            iframe.height(jQuery(window).outerHeight());
                        });
                        jQuery(window).trigger("resize");
                        // Show the iframe
                        iframe.fadeIn(200);
                        iframeW.postMessage(modal.namespace + " " + frameid + " launch", "*");
                        if (typeof (onShow) === typeof (Function))
                            onShow(this);
                        break;
                    case "closeModal":
                        modal.hide();
                        if (typeof (onHide) === typeof (Function))
                            onHide(this);
                        break;
                    case "url":
                        window.location.href = eventSplit[3];
                        break;
                    default:
                        console.log("Could not read event action from modal.", event.data);
                        break;
                }
            }
            window.addEventListener("message", receiveMessage, false);
        };
        /**
         * Hide the modal
         * @return {void}
         */
        Modal.prototype.hide = function () {
            // Hide the modal
            this.iframe.fadeOut(200);
            // Put the scrollbar back
            jQuery("body").css("overflow", "");
            this.iframe.remove();
            this.deleted = true;
        };
        /**
         * Specifies if the modal was deleted
         * @return {Boolean}
         */
        Modal.prototype.isDeleted = function () {
            return this.deleted;
        };
        return Modal;
    })();
    ProcessOut.Modal = Modal;
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../references.ts" />
/**
 * ProcessOut module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    /**
     * ProcessOut Invoice class
     */
    var Invoice = (function () {
        /**
         * Invoice constructor
         */
        function Invoice(instance) {
            this.instance = instance;
        }
        /**
         * Find the requested invoice by its UID
         * @param {string} uid
         * @param {callback} success
         * @param {callback} error
         */
        Invoice.prototype.find = function (uid, success, error) {
            var t = this;
            t.uid = uid;
            t.instance.apiRequest("get", "/invoices/" + uid, {}, function (data, code, jqxhr) {
                t.data = data;
                t.instance.apiRequest("get", "/invoices/" + uid + "/gateways", {}, function (data, code, jqxhr) {
                    t.gatewaysList = [];
                    for (var i = 0; i < data.gateways.length; i++) {
                        t.gatewaysList[i] = ProcessOut.Gateways.Handler.buildGateway(t.instance, data.gateways[i], "/invoices/" + uid, ProcessOut.Flow.OneOff);
                    }
                    success(t);
                }, function () {
                    error({
                        code: ProcessOut.ErrorCode.ResourceNotFound,
                        message: "The invoice's gateways could not be fetched."
                    });
                });
            }, function () {
                error({
                    code: ProcessOut.ErrorCode.ResourceNotFound,
                    message: "The invoice could not be found."
                });
            });
        };
        /**
         * Get the available gateways list for this invoice
         * @return {Gateways.Gateway[]}
         */
        Invoice.prototype.gateways = function () {
            return this.gatewaysList;
        };
        return Invoice;
    })();
    ProcessOut.Invoice = Invoice;
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../references.ts" />
/**
 * ProcessOut module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    /**
     * ProcessOut payment flow enum
     */
    (function (Flow) {
        Flow[Flow["None"] = 1] = "None";
        Flow[Flow["OneOff"] = 2] = "OneOff";
        Flow[Flow["Recurring"] = 3] = "Recurring";
        Flow[Flow["OneClickAuthorization"] = 4] = "OneClickAuthorization";
    })(ProcessOut.Flow || (ProcessOut.Flow = {}));
    var Flow = ProcessOut.Flow;
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../references.ts" />
/**
 * ProcessOut module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var ErrorCode = (function () {
        function ErrorCode() {
        }
        ErrorCode.ProcessOutUnavailable = "processout.unavailable";
        ErrorCode.ResourceNotFound = "resource.not-found";
        ErrorCode.GatewayError = "gateway.error";
        ErrorCode.GatewayInvalidInput = "gateway.invalid-input";
        return ErrorCode;
    })();
    ProcessOut.ErrorCode = ErrorCode;
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../../references.ts" />
/**
 * ProcessOut Gateways module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var Gateways;
    (function (Gateways) {
        /**
         * ProcessOut Gateway handler class
         */
        var Handler = (function () {
            function Handler() {
            }
            /**
             * Build a gateway object depending on the gateway name in the data
             * @param {ProcessOut} instance
             * @param {Object} data
             * @param {string} resourceURL
             * @param {Flow} flow
             * @return {Gateway}
             */
            Handler.buildGateway = function (instance, data, resourceURL, flow) {
                switch (data.name) {
                    case "stripe":
                        return new Gateways.StripeGateway(instance, data, resourceURL, flow);
                    case "checkoutcom":
                        return new Gateways.CheckoutcomGateway(instance, data, resourceURL, flow);
                }
                // Defaulting to link gateway
                return new Gateways.LinkGateway(instance, data, resourceURL, flow);
            };
            return Handler;
        })();
        Gateways.Handler = Handler;
    })(Gateways = ProcessOut.Gateways || (ProcessOut.Gateways = {}));
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../../references.ts" />
/**
 * ProcessOut Gateways module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var Gateways;
    (function (Gateways) {
        /**
         * ProcessOut Gateway class
         */
        var Gateway = (function () {
            /**
             * Constructor, copies data to object
             * @param {ProcessOut} instance
             * @param {Object} data
             * @param {string} resourceURL
             * @param {Flow} flow
             */
            function Gateway(instance, data, resourceURL, flow) {
                this.instance = instance;
                this.resourceURL = resourceURL;
                this.flow = flow;
                this.name = data.name;
                this.displayName = data.display_name;
                this.publicKeys = data.public_keys;
                this.supportedMethod = data.supported_methods;
            }
            /**
             * Get the requested public key in the publicKey object array
             * @param {string} key
             * @return {string}
             */
            Gateway.prototype.getPublicKey = function (key) {
                for (var _i = 0, _a = this.publicKeys; _i < _a.length; _i++) {
                    var v = _a[_i];
                    if (v.key == key) {
                        return v.value;
                    }
                }
                return "";
            };
            /**
             * Format the customer object to an object understandable by the
             * ProcessOut API
             * @return {Object}
             */
            Gateway.prototype.getCustomerObject = function () {
                if (!this.instance.customer) {
                    return {};
                }
                return {
                    email: this.instance.customer.Email,
                    first_name: this.instance.customer.FirstName,
                    last_name: this.instance.customer.LastName,
                    address1: this.instance.customer.Address1,
                    address2: this.instance.customer.Address2,
                    city: this.instance.customer.City,
                    state: this.instance.customer.State,
                    zip: this.instance.customer.ZIP,
                    country_code: this.instance.customer.CountryCode
                };
            };
            /**
             * Get the endpoint for the current flow
             * @return {string}
             */
            Gateway.prototype.getEndpoint = function (async) {
                switch (this.flow) {
                    case ProcessOut.Flow.OneOff:
                        if (!async)
                            return this.resourceURL + ("/gateways/" + this.name);
                        else
                            return this.resourceURL + ("/gateways/" + this.name + "/charges");
                    case ProcessOut.Flow.Recurring:
                    case ProcessOut.Flow.OneClickAuthorization:
                        return this.resourceURL + ("/gateways/" + this.name + "/tokens");
                    default:
                        throw new Error("Could not find flow");
                }
            };
            /**
             * Return the default template for redirections
             * @return {string}
             */
            Gateway.prototype.htmlLink = function () {
                return "<form action=\"\" method=\"POST\" class=\"" + this.instance.classNames('link-form') + "\">\n                        <div class=\"" + this.instance.classNames('link-submit-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('link-submit-lower-wrapper') + "\">\n                                <input type=\"submit\" class=\"" + this.instance.classNames('link-submit') + "\" value=\"Pay now!\">\n                            </div>\n                        </div>\n                    </form>";
            };
            /**
             * Return the default template for credit cards
             * @return {string}
             */
            Gateway.prototype.htmlCreditCard = function () {
                return "<form action=\"#\" method=\"POST\" class=\"" + this.instance.classNames('credit-card-form') + "\">\n                        <div class=\"" + this.instance.classNames('credit-card-number-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('credit-card-number-lower-wrapper') + "\">\n                                <label class=\"" + this.instance.classNames('credit-card-number-label') + "\">Card number</label>\n                                <input type=\"text\" size=\"20\" placeholder=\"8888 8888 8888 8888\" autocomplete=\"cc-number\" class=\"" + this.instance.classNames('credit-card-number-input') + "\" />\n                            </div>\n                        </div>\n                        <div class=\"" + this.instance.classNames('credit-card-expiry-month-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('credit-card-expiry-month-lower-wrapper') + "\">\n                                <label class=\"" + this.instance.classNames('credit-card-expiry-month-label') + "\">Expiry month</label>\n                                <input type=\"text\" placeholder=\"MM\" autocomplete=\"cc-exp-month\" class=\"" + this.instance.classNames('credit-card-expiry-month-input') + "\" />\n                            </div>\n                        </div>\n                        <div class=\"" + this.instance.classNames('credit-card-expiry-year-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('credit-card-expiry-year-lower-wrapper') + "\">\n                                <label class=\"" + this.instance.classNames('credit-card-expiry-year-label') + "\">Expiry year</label>\n                                <input type=\"text\" placeholder=\"YYYY\" autocomplete=\"cc-exp-year\" class=\"" + this.instance.classNames('credit-card-expiry-year-input') + "\" />\n                            </div>\n                        </div>\n                        <div class=\"" + this.instance.classNames('credit-card-cvc-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('credit-card-cvc-lower-wrapper') + "\">\n                                <label class=\"" + this.instance.classNames('credit-card-cvc-label') + "\">CVC</label>\n                                <input type=\"text\" size=\"4\" placeholder=\"123\" autocomplete=\"off\" class=\"" + this.instance.classNames('credit-card-cvc-input') + "\" />\n                            </div>\n                        </div>\n\n                        <div class=\"" + this.instance.classNames('credit-card-submit-upper-wrapper') + "\">\n                            <div class=\"" + this.instance.classNames('credit-card-submit-lower-wrapper') + "\">\n                                <input type=\"submit\" class=\"" + this.instance.classNames('credit-card-submit') + "\" value=\"Pay now!\">\n                            </div>\n                        </div>\n                    </form>";
            };
            /**
             * Append the gateway html to the given html element, and return the
             * inner created form
             * @param {HTMLElement} root
             * @return {HTMLElement}
             */
            Gateway.prototype.appendTo = function (root) {
                if (root.jquery)
                    root = root[0];
                var div = document.createElement("div");
                div.innerHTML = this.html();
                root.appendChild(div);
                var form = div.firstChild.querySelector("form");
                return form;
            };
            /**
             * Hook the given element to be automatically handled when the form
             * is submitted
             * @param {HTMLElement} el
             * @param {callback?} success
             * @param {callback?} error
             * @return {void}
             */
            Gateway.prototype.hook = function (el, success, error) {
                if (el.jquery)
                    el = el[0];
                var t = this;
                el.onsubmit = function () {
                    t.handle(el, success, error);
                    return false;
                };
            };
            /**
             * Setup the current gateway (such as loading the required js library)
             * @return {void}
             */
            Gateway.prototype.setup = function () {
                //
            };
            return Gateway;
        })();
        Gateways.Gateway = Gateway;
    })(Gateways = ProcessOut.Gateways || (ProcessOut.Gateways = {}));
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../../references.ts" />
/// <amd-dependency path="https://js.stripe.com/v2/" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../../definitions/stripe.d.ts" />
/**
 * ProcessOut Gateways module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var Gateways;
    (function (Gateways) {
        /**
         * ProcessOut Gateway class
         */
        var StripeGateway = (function (_super) {
            __extends(StripeGateway, _super);
            /**
             * Constructor, copies data to object
             */
            function StripeGateway(instance, data, actionURL, flow) {
                _super.call(this, instance, data, actionURL, flow);
            }
            StripeGateway.prototype.setup = function () {
                var f = document.createElement("script");
                f.setAttribute("type", "text/javascript");
                f.setAttribute("src", "https://js.stripe.com/v2/");
                document.body.appendChild(f);
            };
            StripeGateway.prototype.html = function () {
                return "<div class=\"" + this.instance.classNames('gateway-form-wrapper', 'gateway-stripe') + "\">\n                        " + this.htmlCreditCard() + "\n                    </div>";
            };
            StripeGateway.prototype.handle = function (el, success, error) {
                Stripe.setPublishableKey(this.getPublicKey("public_key"));
                var submitButton = el.querySelector("input[type=\"submit\"]");
                // We disable submit button to prevent from multiple submition
                submitButton.setAttribute("disabled", "1");
                var numberf = el.getElementsByClassName(this.instance.classNames("credit-card-number-input"))[0];
                var cvcf = el.getElementsByClassName(this.instance.classNames("credit-card-cvc-input"))[0];
                var expmonthf = el.getElementsByClassName(this.instance.classNames("credit-card-expiry-month-input"))[0];
                var expyearf = el.getElementsByClassName(this.instance.classNames("credit-card-expiry-year-input"))[0];
                var t = this;
                try {
                    Stripe.card.createToken({
                        number: numberf.value,
                        cvc: cvcf.value,
                        exp_month: Number(expmonthf.value),
                        exp_year: Number(expyearf.value)
                    }, function (status, response) {
                        if (response.error) {
                            submitButton.removeAttribute("disabled");
                            error({
                                code: ProcessOut.ErrorCode.GatewayInvalidInput,
                                message: response.error.message
                            });
                            return;
                        }
                        // Stripe token correctly generated, let's charge it
                        var data = t.getCustomerObject();
                        data.token = response.id;
                        t.instance.apiRequest("post", t.getEndpoint(true), data, function (resp) {
                            submitButton.removeAttribute("disabled");
                            if (!resp.success) {
                                error({
                                    code: ProcessOut.ErrorCode.GatewayError,
                                    message: resp.message
                                });
                                return;
                            }
                            if (/^https?:\/\/checkout\.processout\.((com)|(ninja)|(dev))\//.test(resp.url)) {
                                success(t.name);
                                return;
                            }
                            window.location.href = resp.url;
                        }, function (request, err) {
                            submitButton.removeAttribute("disabled");
                            error({
                                code: ProcessOut.ErrorCode.GatewayError,
                                message: err
                            });
                        });
                    });
                }
                catch (err) {
                    submitButton.removeAttribute("disabled");
                    error({
                        code: ProcessOut.ErrorCode.GatewayError,
                        message: err
                    });
                }
            };
            return StripeGateway;
        })(Gateways.Gateway);
        Gateways.StripeGateway = StripeGateway;
    })(Gateways = ProcessOut.Gateways || (ProcessOut.Gateways = {}));
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../../references.ts" />
/**
 * ProcessOut Gateways module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var Gateways;
    (function (Gateways) {
        /**
         * ProcessOut Gateway class
         */
        var CheckoutcomGateway = (function (_super) {
            __extends(CheckoutcomGateway, _super);
            /**
             * Constructor, copies data to object
             */
            function CheckoutcomGateway(instance, data, actionURL, flow) {
                _super.call(this, instance, data, actionURL, flow);
            }
            CheckoutcomGateway.prototype.setup = function () {
                var f = document.createElement("script");
                f.setAttribute("type", "text/javascript");
                f.setAttribute("src", "https://cdn.checkout.com/sandbox/js/checkoutkit.js");
                f.setAttribute("data-namespace", "CKOAPI");
                document.body.appendChild(f);
            };
            CheckoutcomGateway.prototype.html = function () {
                return "<div class=\"" + this.instance.classNames('gateway-form-wrapper', 'gateway-checkoutcom') + "\">\n                        " + this.htmlCreditCard() + "\n                    </div>";
            };
            CheckoutcomGateway.prototype.handle = function (el, success, error) {
                var submitButton = el.querySelector("input[type=\"submit\"]");
                // We disable submit button to prevent from multiple submition
                submitButton.setAttribute("disabled", "1");
                var numberf = el.getElementsByClassName(this.instance.classNames("credit-card-number-input"))[0];
                var cvcf = el.getElementsByClassName(this.instance.classNames("credit-card-cvc-input"))[0];
                var expmonthf = el.getElementsByClassName(this.instance.classNames("credit-card-expiry-month-input"))[0];
                var expyearf = el.getElementsByClassName(this.instance.classNames("credit-card-expiry-year-input"))[0];
                var t = this;
                try {
                    CKOAPI.configure({
                        publicKey: t.getPublicKey("public_key"),
                        apiError: function (event) {
                            submitButton.removeAttribute("disabled");
                            // 7xxx errors are validation errors
                            if (event.data.errorCode[0] == "7")
                                error({
                                    code: ProcessOut.ErrorCode.GatewayInvalidInput,
                                    message: event.data.message
                                });
                            else
                                error({
                                    code: ProcessOut.ErrorCode.GatewayError,
                                    message: event.data.message
                                });
                        }
                    });
                    CKOAPI.createCardToken({
                        "number": numberf.value,
                        "cvv": cvcf.value,
                        "expiryMonth": Number(expmonthf.value),
                        "expiryYear": Number(expyearf.value)
                    }, function (v) {
                        if (!v.id)
                            return;
                        // Stripe token correctly generated, let's charge it
                        var data = t.getCustomerObject();
                        data.token = v.id;
                        t.instance.apiRequest("post", t.getEndpoint(true), data, function (resp) {
                            submitButton.removeAttribute("disabled");
                            if (!resp.success) {
                                error({
                                    code: ProcessOut.ErrorCode.GatewayError,
                                    message: resp.message
                                });
                                return;
                            }
                            if (/^https?:\/\/checkout\.processout\.((com)|(ninja)|(dev))\//.test(resp.url)) {
                                success(t.name);
                                return;
                            }
                            window.location.href = resp.url;
                        }, function (request, err) {
                            submitButton.removeAttribute("disabled");
                            error({
                                code: ProcessOut.ErrorCode.GatewayError,
                                message: err
                            });
                        });
                    });
                }
                catch (err) {
                    submitButton.removeAttribute("disabled");
                    error({
                        code: ProcessOut.ErrorCode.GatewayError,
                        message: err
                    });
                }
            };
            return CheckoutcomGateway;
        })(Gateways.Gateway);
        Gateways.CheckoutcomGateway = CheckoutcomGateway;
    })(Gateways = ProcessOut.Gateways || (ProcessOut.Gateways = {}));
})(ProcessOut || (ProcessOut = {}));
/// <reference path="../../references.ts" />
/// <amd-dependency path="https://js.stripe.com/v2/" />
/**
 * ProcessOut Gateways module/namespace
 */
var ProcessOut;
(function (ProcessOut) {
    var Gateways;
    (function (Gateways) {
        /**
         * ProcessOut Gateway class
         */
        var LinkGateway = (function (_super) {
            __extends(LinkGateway, _super);
            /**
             * Constructor, copies data to object
             */
            function LinkGateway(instance, data, actionURL, flow) {
                _super.call(this, instance, data, actionURL, flow);
            }
            LinkGateway.prototype.html = function () {
                return "<div class=\"" + this.instance.classNames('gateway-form-wrapper', "gateway-" + this.name) + "\">\n                        " + this.htmlLink() + "\n                    </div>";
            };
            LinkGateway.prototype.handle = function (el, success, error) {
                var t = this;
                this.instance.apiRequest("get", this.getEndpoint(false), this.getCustomerObject(), function (resp) {
                    if (!resp.success) {
                        error({
                            code: ProcessOut.ErrorCode.GatewayError,
                            message: resp.message
                        });
                        return;
                    }
                    window.location.href = resp.customer_action.url;
                }, function (request, err) {
                    error({
                        code: ProcessOut.ErrorCode.GatewayError,
                        message: err
                    });
                });
            };
            return LinkGateway;
        })(Gateways.Gateway);
        Gateways.LinkGateway = LinkGateway;
    })(Gateways = ProcessOut.Gateways || (ProcessOut.Gateways = {}));
})(ProcessOut || (ProcessOut = {}));
/// <reference path="processout/processout.ts" />
/// <reference path="processout/modal.ts" />
/// <reference path="processout/invoice.ts" />
/// <reference path="processout/customer.ts" />
/// <reference path="processout/flow.ts" />
/// <reference path="processout/error.ts" />
/// <reference path="processout/gateways/handler.ts" />
/// <reference path="processout/gateways/gateway.ts" />
/// <reference path="processout/gateways/stripe.ts" />
/// <reference path="processout/gateways/checkoutcom.ts" />
/// <reference path="processout/gateways/link.ts" />
/// <reference path="../references.ts" />
