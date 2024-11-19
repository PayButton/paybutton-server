export const generatorFormFields = [
  {
    name: 'To',
    placeholder: 'Your Address',
    key: 'to',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleAddressChange',
    helpText: 'Where the money will be sent to'
  },
  {
    name: 'Amount',
    placeholder: '0',
    key: 'amount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange',
    helpText: 'How much money to request'
  },
  {
    name: 'Currency',
    key: 'currency',
    className: 'col_currency',
    options: ['XEC', 'USD', 'CAD'],
    type: 'select',
    onChange: 'handleChange'
  },
  {
    name: 'Text',
    placeholder: 'Donate',
    key: 'text',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'The text displayed on the button'
  },
  {
    name: 'Animation',
    key: 'animation',
    className: 'col_sm',
    options: ['slide', 'invert', 'none'],
    type: 'select',
    onChange: 'handleChange',
    helpText: 'The button hover animation'
  },
  {
    name: 'Goal Amount',
    placeholder: 'Goal Amount',
    key: 'goalAmount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange',
    helpText: 'Specifies a funding goal amount, indicated with a progress bar'
  },
  {
    name: 'Hover Text',
    placeholder: 'Send XEC',
    key: 'hoverText',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'The text displayed on the button on hover'
  },
  {
    name: 'Primary',
    key: 'primary',
    className: 'col_xs',
    type: 'color',
    helpText: 'The primary, secondary, and tertiary are color options that allow for custom themeing'
  },
  {
    name: 'Secondary',
    key: 'secondary',
    className: 'col_xs',
    type: 'color'
  },
  {
    name: 'Tertiary',
    key: 'tertiary',
    className: 'col_xs',
    type: 'color'
  },
  {
    name: 'Success Text',
    placeholder: 'Thanks for your support!',
    key: 'successText',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'The text displayed upon successful payment'
  },
  {
    name: 'Widget',
    key: 'widget',
    className: 'col_sm_center',
    type: 'boolean',
    default: false,
    helpText: 'Creates an always-visible PayButton Widget'
  },
  {
    name: 'Random Sats',
    key: 'randomSatoshis',
    className: 'col_sm_center',
    type: 'boolean',
    default: true,
    helpText: 'Randomizes the last few digits (satoshis) of the payment amount so it’s unlikely a payment made by one person will trigger the onSuccess callback of another'
  },
  {
    name: 'On-success',
    placeholder: 'Callback function',
    key: 'onSuccess',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'Callback function that runs upon successful payment',
    advanced: true
  },
  {
    name: 'Hide Toasts',
    key: 'hideToasts',
    className: 'col_sm_center',
    type: 'boolean',
    default: false,
    helpText: 'Disable transaction sounds and popups',
    advanced: true
  },
  {
    name: 'Disable EF',
    key: 'disableEnforceFocus',
    className: 'col_sm_center',
    type: 'boolean',
    default: true,
    helpText: 'When false, disableEnforceFocus, can help with accessibility technology such as screen readers but may throw errors on sites running Material UI',
    advanced: true
  },
  {
    name: 'On-transaction',
    placeholder: 'Callback function',
    key: 'onTransaction',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'Callback function that runs upon any payment',
    advanced: true
  },
  {
    name: 'Disabled',
    key: 'disabled',
    className: 'col_sm_center',
    type: 'boolean',
    default: false,
    helpText: 'Disable the button or widget',
    advanced: true
  },
  {
    name: 'Editable',
    key: 'editable',
    className: 'col_sm_center',
    type: 'boolean',
    default: true,
    helpText: 'Allow changing the payment amount',
    advanced: true
  },
  {
    name: 'OP-Return',
    placeholder: 'myCustomMessage',
    key: 'opReturn',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'Custom message that will be sent with the transaction',
    advanced: true
  },
  {
    name: 'Disable Payment ID',
    key: 'disablePaymentId',
    className: 'col_sm_center',
    type: 'boolean',
    default: false,
    helpText: 'Removes the random ID generated for the payment that is used to prevent the onSuccess callback to be triggered by a person who has the payment screen open at the same time as another',
    advanced: true
  },
]