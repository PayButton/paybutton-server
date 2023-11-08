export const generatorFormFields = [
  {
    name: 'To',
    placeholder: 'Your Address',
    key: 'to',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleAddressChange',
    helpText: '*Required | Specifies where the money will be sent to. Can be any valid eCash or Bitcoin Cash address'
  },
  {
    name: 'Amount',
    placeholder: '0',
    key: 'amount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange',
    helpText: 'Specifies how much money to request. Use this in conjunction with the optional \'currency\' paramter to specify a specific amount in a different currency'
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
    helpText: 'Specifies the default text displayed on the button'
  },
  {
    name: 'Animation',
    key: 'animation',
    className: 'col_sm',
    options: ['slide', 'invert', 'none'],
    type: 'select',
    onChange: 'handleChange',
    helpText: 'Specifies how the buttons change when hovering over them'
  },
  {
    name: 'Goal Amount',
    placeholder: 'Goal Amount',
    key: 'goalAmount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange',
    helpText: 'Specifies how much in contributions is required for funding to be considered complete, indicated by a progress bar'
  },
  {
    name: 'Hover Text',
    placeholder: 'Send XEC',
    key: 'hoverText',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange',
    helpText: 'Specifies the text displayed on the button on hover'
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
    helpText: 'Specifies the text displayed upon successful payment'
  },
  {
    name: 'Widget',
    placeholder: 'widget',
    key: 'widget',
    className: 'col_sm_center',
    type: 'boolean',
    default: false,
    helpText: 'Creates an always-visible PayButton Widget that doesn\'t require clicking a button to open'
  },
  {
    name: 'Random Satoshis',
    placeholder: 'randomSatoshis',
    key: 'randomSatoshis',
    className: 'col_sm_center',
    type: 'boolean',
    default: true
  }
]
