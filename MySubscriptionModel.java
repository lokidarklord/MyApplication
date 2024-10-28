package com.eaton.ecommerce.core.models.v1;

import com.day.cq.commons.Externalizer;
import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.designer.Style;
import com.eaton.brightlayer.utils.SecureUtils;
import com.eaton.ecommerce.constants.I18nConstants;
import com.eaton.ecommerce.integration.entitlement.EntitlementApi;
import com.eaton.ecommerce.integration.entitlement.EntitlementRequest;
import com.eaton.ecommerce.integration.entitlement.NoAccessTokenException;
import com.eaton.ecommerce.integration.entitlement.dto.EntitlementResponse;
import com.eaton.ecommerce.integration.entitlement.dto.LineItem;
import com.eaton.ecommerce.service.CartRequestService;
import com.eaton.ecommerce.service.ErpProductService;
import com.eaton.ecommerce.service.GoogleRecaptcha;
import com.eaton.ecommerce.service.dto.ErpProductInfo;
import com.eaton.ecommerce.service.exeception.ProductPricingException;
import com.eaton.platform.core.util.CommonUtil;
import com.eaton.platform.integration.auth.services.AuthorizationService;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.http.NameValuePair;
import org.apache.http.message.BasicNameValuePair;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.OSGiService;
import org.apache.sling.models.annotations.injectorspecific.ScriptVariable;
import org.apache.sling.models.annotations.injectorspecific.Self;
import org.apache.sling.settings.SlingSettingsService;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import java.io.IOException;
import java.net.URISyntaxException;
import java.text.NumberFormat;
import java.util.*;

import static com.eaton.ecommerce.constants.CartConstants.*;
import static com.eaton.ecommerce.constants.EntitlementConstants.*;
import static com.eaton.ecommerce.integration.entitlement.dto.LineItem.PART_ID;


@Model(adaptables = SlingHttpServletRequest.class,
        defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
        resourceType = MySubscriptionModel.RESOURCE_TYPE
)
public class MySubscriptionModel {

    private static final Logger LOG = LoggerFactory.getLogger(MySubscriptionModel.class);

    public static final String RESOURCE_TYPE="eaton/components/digital/core/secure/my-subscription/v1/my-subscription";
    public static final String INITIAL_COUNT_VAR="initialcount";

    @Self
    @JsonIgnore
    SlingHttpServletRequest request;

    @Inject
    @JsonIgnore
    EntitlementApi api;

    @OSGiService(filter = "(name=entitlement)")
    @JsonIgnore
    EntitlementRequest entitlementRequest;

    //this will be the response for subscription selector call
    @JsonProperty
    @JsonIgnore
    EntitlementResponse result;

    @OSGiService
    GoogleRecaptcha googleRecaptcha;
    
    @OSGiService
    ErpProductService erpProductService;
    
    @OSGiService
    private CartRequestService cartRequestService;

    @JsonProperty
    @JsonIgnore
    boolean apiStatus;

    @JsonProperty
    @JsonIgnore
    boolean hasSearchResults;
    
    @JsonProperty
    boolean showAddMoreColumn = false;

    @Inject
    @JsonIgnore
    AuthorizationService authorizationService;

    @Inject
    @JsonIgnore
    SlingSettingsService slingSettingsService;

    @JsonProperty
    List<LineItem> items;

    @Inject
    @JsonIgnore
    Style currentStyle;

    @ScriptVariable
    @JsonIgnore
    private Page currentPage;

    
    private String orderConfirmationNote = "Your resubmission request was successful.  Please keep your confirmation number for your records:";


    int initialCount = 10;

    private String recaptchaSiteKey;

    private String shouldHide="false";

    @PostConstruct
    void initModel()  {
        items = new ArrayList<>();
        this.orderConfirmationNote = CommonUtil.getI18NFromResourceBundle(request,currentPage,I18nConstants.ORDER_CONFIRMATION,this.orderConfirmationNote);
        if(null != googleRecaptcha) {
            recaptchaSiteKey = googleRecaptcha.getSiteKey();
        }
        if(null != entitlementRequest && null != api && null != request){
            try {
                handleInitialLoad();
                if(null !=result && null != result.getEntitlement()){
                    this.apiStatus = result.getStatusInfo().get("status").equalsIgnoreCase("SUCCESS");
                    this.hasSearchResults = Integer.parseInt(result.getStatusInfo().get("total")) > 0;
                    result.getEntitlement().forEach((curItem)->{
                    	List<LineItem> lineItems = curItem.getSimpleEntitlement().getLineItems();
                    	lineItems = getMatchingProductIds(lineItems);
                        items.addAll(lineItems);
                    });
                    if(null != items && !items.isEmpty()) {
                        Collections.sort(items);
                    }
                }else{
                    handleError("No Result Available");
                }
                if(null != currentStyle){
                    this.initialCount = currentStyle.get(INITIAL_COUNT_VAR,10);
                }
            }catch (IOException | URISyntaxException e) {
                LOG.error("IOException | URISyntaxException thrown in MySubscriptionModel :: {}",e.getMessage(),e);
                handleError("Issue fetching your results");
            }catch (NoAccessTokenException e){
                LOG.error("NoAccessTokenException thrown in MySubscriptionModel :: {}",e.getMessage(),e);
                handleError("Unable to retrieve access token");
            }catch (Exception e){
                LOG.error("Exception thrown in MySubscriptionModel :: {}",e.getMessage(),e);
            }
        }
        defineShouldHide();
    }

    /**
     * Handle initial load of component. If author env, then return mock data
     * If not author, check user auth. Throw error if user not login
     *
     * @throws IOException
     * @throws URISyntaxException
     */

    void defineShouldHide(){
        int count=0;
        String childName;
        Resource resource=this.request.getResource().getParent();
        childName=resource.getName();
        if(childName.startsWith("par"))
        {
            Iterable<Resource> res=resource.getChildren();
            for(Resource child : res)
            {
                count++;
            }
        }
        if(count>1){
            if(items.isEmpty()){
                this.shouldHide="hideMySubscription";
            }else{
                this.shouldHide="false";}
            }else if(count==1) {
            if (items.isEmpty()) {
                this.shouldHide = "true";
            }
        }
    }
    void handleInitialLoad() throws IOException, URISyntaxException, NoAccessTokenException {
        LOG.debug("MySubscriptionModel :: handleInitialLoad :: Start");
        if(isAuthor()){
            // meaning we are going through mock data
            executeApiCall(Collections.emptyList(),StringUtils.EMPTY);
        } else {
            String authUserEmail = SecureUtils.getAuthUserEmail(request,authorizationService,false,StringUtils.EMPTY);
            if(StringUtils.isBlank(authUserEmail)){
                // in theory it shouldn't come here
                handleError("Current User is not log in");
                return;
            }
            // this mean it's everything but author
            List<NameValuePair> params = new ArrayList<>();
            params.add(new BasicNameValuePair(SHIP_TO_EMAIL, authUserEmail));
            LOG.debug("Parameter Values: {}",params);
            executeApiCall(params,StringUtils.EMPTY);
        }
    }

    /**
     * Execute Api Call to entitlement api
     *
     * @param params - base ib entitlement request param
     * @param body
     * @throws IOException
     * @throws URISyntaxException
     */
    void executeApiCall(List<NameValuePair> params, String body) throws IOException, URISyntaxException, NoAccessTokenException {
        LOG.debug("MySubscriptionModel :: executeApiCall :: Start");
        LOG.debug("Request Object: {}",entitlementRequest);
        String resp = api.makeApiRequest(entitlementRequest,params, body);
        if(StringUtils.isNotBlank(resp)) {
            result = new ObjectMapper().readValue(resp, EntitlementResponse.class);
            LOG.debug("Result Value: {}",resp);
        }else{
            handleError("No Result Available");
        }
    }
    
    private List<LineItem> getMatchingProductIds(List<LineItem> item) {
    	LOG.debug("MySubscriptionModel :: getMatchingProductIds :: Start");
		item.forEach((curItem)->{
    		try {
    			String productLineName = curItem.getProductLine().getName();
	    		ErpProductInfo productInfo = erpProductService.findErpProductInfo(curItem.getPartNumber().getPrimaryKeys().get(PART_ID));
	    		if(productInfo!=null) {
		    		String reveneraProductCategory = productInfo.getReveneraProductCategory();
		    		if(reveneraProductCategory!=null && reveneraProductCategory.equals(productLineName)) {
                        curItem.setWithinCategory(true);
                        String price = getPricingInformation(productInfo);
	    				curItem.setPrice(price);
		    			curItem.setIsAvailableInWhiteList(true);
		    			showAddMoreColumn = true;
		    		}
	    		}
    		}catch(Exception e) {
    			LOG.error("MySubscriptionModel :: getMatchingProductIds :: Error :: {}",e);
    		}
		});
    	return item;
    }
    
    private String getPricingInformation(ErpProductInfo productInfo) throws ProductPricingException, JSONException {
    	LOG.debug("MySubscriptionModel :: getPricingInformation for {} :: Start",productInfo.getMaterialId());
    	String materialId = productInfo.getMaterialId();
    	String soldTo = productInfo.getSoldTo();
        String erpSystem = productInfo.getErpSystem();
        List<NameValuePair> params = new ArrayList<>();
        params.add(new BasicNameValuePair(PRODUCT_ID_QUALIFIER, PRODUCT_IDENTIFIER_MAT));
        params.add(new BasicNameValuePair(CUSTOMER_NUMBER, String.valueOf(soldTo)));
        if (StringUtils.isNotBlank(productInfo.getSalesOrgOne())
                && StringUtils.isNotBlank(productInfo.getSalesOrgTwo())
                && StringUtils.isNotBlank(productInfo.getSalesOrgThree())
        ) {
            String[] salesOrgsArr = { productInfo.getSalesOrgOne(), productInfo.getSalesOrgTwo(),
                    productInfo.getSalesOrgThree() };
            Map<String,String> salesOrg = new HashMap<>();
            salesOrg.put(ORG,productInfo.getSalesOrgOne());
            salesOrg.put(DIVISION,productInfo.getSalesOrgTwo());
            salesOrg.put(CHANNEL_VAR,productInfo.getSalesOrgThree());
            String commaSeparatedSalesOrgs = StringUtils.join(salesOrgsArr, ",");
            params.add(new BasicNameValuePair(SALES_ORGS, commaSeparatedSalesOrgs));
        }
        Map<Integer, String> productResult = cartRequestService.getProductPricing(materialId, erpSystem, params);
        String productPricing = productResult.get(HttpStatus.SC_OK);
        if (StringUtils.isNotBlank(productPricing)) {
        	JSONObject pricingJSON = new JSONObject(productPricing);
        	if (!ObjectUtils.isEmpty(pricingJSON)
                    && null != pricingJSON.getJSONArray(PRICING_INFO_VAR)
                    && pricingJSON.getJSONArray(PRICING_INFO_VAR).length() > 0) {
                JSONArray pricingInfo = pricingJSON.getJSONArray(PRICING_INFO_VAR);
                JSONObject singlePriceInfo = pricingInfo.getJSONObject(0);
                if (singlePriceInfo.has(NET_PRICE)) {
                    String price = singlePriceInfo.getString(NET_PRICE);
                    String currencyCode = singlePriceInfo.getString(CURRENCY_CODE);
                    return formatPriceWithCurrency(price, currencyCode);
                }
            }
        }
        return StringUtils.EMPTY;
    }
    
    private static String formatPriceWithCurrency(String price, String currencyCode) {
        NumberFormat numberFormat = NumberFormat.getNumberInstance();
        if(StringUtils.isNotBlank(currencyCode)){
            Currency currentCurrency = Currency.getInstance(currencyCode);
            numberFormat.setCurrency(currentCurrency);
        } else {
            // default to us currency
            numberFormat.setCurrency(Currency.getInstance(Locale.US));
        }
        return numberFormat.format(Float.parseFloat(price));
    }
    private boolean isAuthor(){
        return slingSettingsService.getRunModes().contains(Externalizer.AUTHOR);
    }

    /**
     * Create error result object to handle if any error occur
     * @param reason
     */
    void handleError(String reason){
        result = new EntitlementResponse();
        Map<String,String> statusInfo = new HashMap<>();
        statusInfo.put("status","failed");
        statusInfo.put("reason",reason);
        result.setStatusInfo(statusInfo);
    }

    public String getOrderConfirmationNote() {
        return orderConfirmationNote;
    }

    public EntitlementResponse getResult() {
        return result;
    }

    public List<LineItem> getItems(){
        return this.items;
    }

    // used to display raw json data in htl
    public String getJson() throws JsonProcessingException {
        return new ObjectMapper().writeValueAsString(result);
    }
    public int getInitialCount() {
        return initialCount;
    }

    public boolean renderLoadMore(){
        return this.initialCount < items.size();
    }

    public boolean isApiStatus() {
        return apiStatus;
    }

    public boolean isHasSearchResults() {
        return hasSearchResults;
    }

    public String getRecaptchaSiteKey() {
        return recaptchaSiteKey;
    }
    public String isShouldHide() {
        return shouldHide;
    }

    public boolean isShowAddMoreColumn() {
        return showAddMoreColumn;
    }
}
