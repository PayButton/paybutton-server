export const generatorFormFields = [
  {
    name: 'To',
    placeholder: 'Your Address',
    key: 'to',
    className: 'col70',
    type: 'input',
    onChange: 'handleAddressChange'
  },
  {
    name: 'Amount',
    placeholder: '0',
    key: 'amount',
    className: 'col15',
    type: 'input',
    onChange: 'handleAmountChange'
  },
  {
    name: 'Currency',
    key: 'currency',
    className: 'colCurrency',
    options: ['XEC', 'USD', 'CAD'],
    type: 'select',
    onChange: 'handleChange'
  },
  {
    name: 'Text',
    placeholder: 'Donate',
    key: 'text',
    className: 'col70',
    type: 'input',
    onChange: 'handleChange'
  },
  {
    name: 'Animation',
    key: 'animation',
    className: 'col15',
    options: ['slide', 'invert', 'none'],
    type: 'select',
    onChange: 'handleChange'
  },
  {
    name: 'Goal Amount',
    placeholder: 'Goal Amount',
    key: 'goalAmount',
    className: 'col15',
    type: 'input',
    onChange: 'handleAmountChange'
  },
  {
    name: 'Hover Text',
    placeholder: 'Send XEC',
    key: 'hoverText',
    className: 'col70',
    type: 'input',
    onChange: 'handleChange'
  },
  {
    name: 'Primary',
    key: 'primary',
    className: 'col10',
    type: 'color'
  },
  {
    name: 'Secondary',
    key: 'secondary',
    className: 'col10',
    type: 'color'
  },
  {
    name: 'Tertiary',
    key: 'tertiary',
    className: 'col10',
    type: 'color'
  },
  {
    name: 'Success Text',
    placeholder: 'Thanks for your support!',
    key: 'successText',
    className: 'col70',
    type: 'input',
    onChange: 'handleChange'
  },
  {
    name: 'Widget',
    placeholder: 'widget',
    key: 'widget',
    className: 'col15_center',
    type: 'boolean',
    default: false
  },
  {
    name: 'Random Satoshis',
    placeholder: 'randomSatoshis',
    key: 'randomSatoshis',
    className: 'col15_center',
    type: 'boolean',
    default: true
  }
]
