export const generatorFormFields = [
  {
    name: 'To',
    placeholder: 'Your Address',
    key: 'to',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleAddressChange'
  },
  {
    name: 'Amount',
    placeholder: '0',
    key: 'amount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange'
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
    onChange: 'handleChange'
  },
  {
    name: 'Animation',
    key: 'animation',
    className: 'col_sm',
    options: ['slide', 'invert', 'none'],
    type: 'select',
    onChange: 'handleChange'
  },
  {
    name: 'Goal Amount',
    placeholder: 'Goal Amount',
    key: 'goalAmount',
    className: 'col_sm',
    type: 'input',
    onChange: 'handleAmountChange'
  },
  {
    name: 'Hover Text',
    placeholder: 'Send XEC',
    key: 'hoverText',
    className: 'col_lg',
    type: 'input',
    onChange: 'handleChange'
  },
  {
    name: 'Primary',
    key: 'primary',
    className: 'col_xs',
    type: 'color'
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
    onChange: 'handleChange'
  },
  {
    name: 'Widget',
    placeholder: 'widget',
    key: 'widget',
    className: 'col_sm_center',
    type: 'boolean',
    default: false
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
