/// <reference path="../references.ts" />

/**
 * ProcessOut module/namespace
 */
module ProcessOut {

    const processoutjsQuery     = "processoutjs";
    const processoutjsQueryTrue = "true";
    
    /**
     * ActionHandler is the class handling the customer actions
     */
    export class ThreeDS {

        /**
         * ProcessOut instance of the current context
         * @type {ProcessOut}
         */
        protected instance: ProcessOut;

        /**
         * url contains the URL to which the user should be redirected
         * to initiate the 3DS flow
         * @type {string}
         */
        protected url: string;

        /**
         * ThreeDS constructor
         * @param {ProcessOut} instance
         * @param {ThreeDSOptions} options
         */
        constructor(instance: ProcessOut, options: ThreeDSOptions) {
            this.instance  = instance;

            if (!options.source) {
                throw new Exception("request.validation.error", "Please provide a source to be used to start the 3-D Secure flow.");
            }

            var url = options.url;
            if (!url && options.invoiceID) {
                url = `/${this.instance.getProjectID()}/${options.invoiceID}/three-d-s/redirect/${options.source}?${processoutjsQuery}=${processoutjsQueryTrue}`;
            }

            if (!url) {
                url = `/${this.instance.getProjectID()}/three-d-s`+
                    `?${processoutjsQuery}=${processoutjsQueryTrue}`+
                    `&amount=${encodeURIComponent(options.amount)}`+
                    `&currency=${encodeURIComponent(options.currency)}`+
                    `&name=${encodeURIComponent(options.name)}`+
                    `&return_url=${encodeURIComponent(options.returnURL?options.returnURL:"")}`+
                    `&source=${encodeURIComponent(options.source)}`;

                if (options.metadata && typeof options.metadata == 'object') {
                    for (var i in options.metadata) {
                        if (!options.metadata.hasOwnProperty(i))
                            continue;

                        url += `&metadata[${i}]=${encodeURIComponent(options.metadata[i])}`;
                    }
                }
            }

            if (!url) {
                throw new Exception("request.validation.error", "Please provide a 3DS challenge URL or an invoice ID.");
            }

            this.url = url;
        }

        /**
         * handle handles the 3-D Secure authentication using the 
         * ActionHandler object
         * @param {callback} success 
         * @param {callback} error 
         * @return {ActionHandler}
         */
        public handle(success: (invoiceID: string)    => void,
                        error: (err:       Exception) => void): ActionHandler {

            return this.instance.handleAction(this.instance.endpoint("checkout", this.url),
                function(invoiceID) { success(invoiceID); }, error, 
                new ActionHandlerOptions(ActionHandlerOptions.ThreeDSChallengeFlow));
        }

    }

}
