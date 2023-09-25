export default function AdvancedOptions({
  button,
  handleInputChange,
}): JSX.Element {
  return (
    <>
      <label>Goal Amount</label>
      <input
        type="text"
        name="goalAmount"
        value={button.goalAmount}
        placeholder="0"
        onChange={handleInputChange}
      />
      <label>On Success</label>
      <input
        type="text"
        name="onSuccess"
        value={button.onSuccess}
        placeholder="callback function"
        onChange={handleInputChange}
      />
      <label>On Transaction</label>
      <input
        type="text"
        name="onTransaction"
        value={button.onTransaction}
        placeholder="callback function"
        onChange={handleInputChange}
      />
      <label>WS Base Url</label>
      <input
        type="text"
        name="wsBaseUrl"
        value={button.wsBaseUrl}
        placeholder="https://socket.paybutton.org"
        onChange={handleInputChange}
      />
      <label>API Base Url</label>
      <input
        type="text"
        name="apiBaseUrl"
        value={button.apiBaseUrl}
        placeholder="https://paybutton.org"
        onChange={handleInputChange}
      />
    </>
  );
}
